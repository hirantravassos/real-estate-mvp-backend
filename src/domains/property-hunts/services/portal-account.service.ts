import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { portalsConfig } from "../../../config/portals.config";
import { PORTAL_KEYS } from "../constants/portals.constant";
import { PortalAccountSaveDto } from "../dtos/property-hunt.dto";
import { PortalAccount } from "../entities/portal-account.entity";
import { PortalAccountStatus, PortalKey } from "../enums/property-hunt.enum";
import {
  decryptSecret,
  encryptSecret,
} from "../helpers/credential-cipher.helper";
import { PropertyHuntMapper } from "../mappers/property-hunt.mapper";
import { PortalSessionService, SignInResult } from "./portal-session.service";

/** A signed in session of the platform, ready for a hunt. */
export interface PortalSession {
  account: PortalAccount;
  storageState: string | null;
}

/**
 * Keeps the platform's logins on the portals, encrypted, and their signed in
 * sessions. Every broker's hunts browse with these accounts, so no broker
 * has to connect anything.
 */
@Injectable()
export class PortalAccountService {
  constructor(
    @Inject(portalsConfig.KEY)
    private readonly configuration: ConfigType<typeof portalsConfig>,
    @InjectRepository(PortalAccount)
    private readonly accountRepository: Repository<PortalAccount>,
    private readonly sessionService: PortalSessionService,
  ) {}

  /** Which portals are signed in, shown to the brokers before a hunt. */
  async readiness() {
    const connected = await this.accountRepository.find({
      where: {
        userId: IsNull(),
        active: true,
        status: PortalAccountStatus.CONNECTED,
      },
    });
    return {
      browserReady: this.sessionService.isAvailable,
      portals: PORTAL_KEYS.map((portal) =>
        PropertyHuntMapper.toPortalDto(
          portal,
          null,
          connected.some((account) => account.portal === portal),
        ),
      ),
    };
  }

  /** Every platform account with its status, for the admin page. */
  async list() {
    const accounts = await this.accountRepository.find({
      where: { userId: IsNull(), active: true },
    });
    return {
      browserReady: this.sessionService.isAvailable,
      portals: PORTAL_KEYS.map((portal) => {
        const account =
          accounts.find((candidate) => candidate.portal === portal) ?? null;
        return PropertyHuntMapper.toPortalDto(
          portal,
          account,
          account?.status === PortalAccountStatus.CONNECTED,
        );
      }),
    };
  }

  /** Saves the login and signs in right away, so the admin sees it working. */
  async connect(portal: PortalKey, dto: PortalAccountSaveDto) {
    this.ensureReady();
    const account =
      (await this.findAccount(portal, true)) ??
      this.accountRepository.create({
        userId: null,
        portal,
        status: PortalAccountStatus.UNCHECKED,
      });

    const loginChanged = account.login !== dto.login;
    account.login = dto.login;
    if (dto.password) {
      account.passwordCipher = this.encrypt(dto.password);
    } else if (loginChanged) {
      account.passwordCipher = null;
    }
    account.active = true;
    const saved = await this.accountRepository.save(account);

    const result = await this.sessionService.signIn(
      saved.id,
      portal,
      saved.login,
      this.decrypt(saved.passwordCipher),
    );
    return this.applySignIn(saved, result);
  }

  async submitCode(portal: PortalKey, code: string) {
    const account = await this.findAccount(portal);
    if (!account)
      throw new NotFoundException("Conta do portal não encontrada.");
    const result = await this.sessionService.submitCode(account.id, code);
    return this.applySignIn(account, result);
  }

  /** Signs in again with the saved password, to test or refresh the session. */
  async check(portal: PortalKey) {
    this.ensureReady();
    const account = await this.findAccount(portal, true);
    if (!account)
      throw new NotFoundException("Conta do portal não encontrada.");
    const result = await this.sessionService.signIn(
      account.id,
      portal,
      account.login,
      this.decrypt(account.passwordCipher),
    );
    return this.applySignIn(account, result);
  }

  async remove(portal: PortalKey) {
    const account = await this.findAccount(portal);
    if (!account) return;
    await this.sessionService.discardPending(account.id);
    await this.accountRepository.update(
      { id: account.id },
      {
        active: false,
        passwordCipher: null,
        sessionCipher: null,
        status: PortalAccountStatus.UNCHECKED,
      },
    );
  }

  /** The session a hunt uses on this portal, or null to browse signed out. */
  async sessionFor(portal: PortalKey): Promise<PortalSession | null> {
    const account = await this.findAccount(portal, true);
    if (
      !account ||
      (account.status !== PortalAccountStatus.CONNECTED &&
        !account.passwordCipher)
    ) {
      return null;
    }
    return { account, storageState: this.decrypt(account.sessionCipher) };
  }

  /** Signs in again quietly when the session expired in the middle of a hunt. */
  async reconnect(account: PortalAccount) {
    const password = this.decrypt(account.passwordCipher);
    if (!password) {
      await this.markExpired(account);
      return null;
    }
    const result = await this.sessionService.signIn(
      account.id,
      account.portal,
      account.login,
      password,
    );
    if (result.status === "awaiting_code") {
      await this.sessionService.discardPending(account.id);
    }
    await this.applySignIn(account, result);
    return result.status === "connected" ? result.storageState : null;
  }

  /** Keeps the refreshed cookies after a hunt browsed signed in. */
  async storeSession(account: PortalAccount, storageState: string) {
    await this.accountRepository.update(
      { id: account.id },
      { sessionCipher: this.encrypt(storageState), lastUsedAt: new Date() },
    );
  }

  async markExpired(account: PortalAccount) {
    await this.accountRepository.update(
      { id: account.id },
      {
        status: PortalAccountStatus.FAILED,
        statusMessage:
          "A sessão expirou. Conecte de novo para ver os telefones.",
      },
    );
  }

  private async applySignIn(account: PortalAccount, result: SignInResult) {
    if (result.status === "connected") {
      account.status = PortalAccountStatus.CONNECTED;
      account.statusMessage = null;
      account.connectedAt = new Date();
      account.sessionCipher = this.encrypt(result.storageState);
    } else if (result.status === "awaiting_code") {
      account.status = PortalAccountStatus.AWAITING_CODE;
      account.statusMessage = result.message;
    } else {
      account.status = PortalAccountStatus.FAILED;
      account.statusMessage = result.message.substring(0, 255);
    }
    await this.accountRepository.update(
      { id: account.id },
      {
        status: account.status,
        statusMessage: account.statusMessage,
        connectedAt: account.connectedAt,
        ...(result.status === "connected"
          ? { sessionCipher: account.sessionCipher }
          : {}),
      },
    );
    return PropertyHuntMapper.toPortalDto(
      account.portal,
      account,
      account.status === PortalAccountStatus.CONNECTED,
    );
  }

  private async findAccount(portal: PortalKey, withSecrets = false) {
    const query = this.accountRepository
      .createQueryBuilder("account")
      .where("account.portal = :portal", { portal })
      .andWhere("account.active = :active", { active: true })
      .andWhere("account.userId IS NULL")
      .orderBy("account.updatedAt", "DESC");
    if (withSecrets) {
      query.addSelect(["account.passwordCipher", "account.sessionCipher"]);
    }
    return query.getOne();
  }

  private ensureReady() {
    if (!this.configuration.credentialsSecret) {
      throw new ServiceUnavailableException(
        "O cofre de senhas dos portais não está configurado no servidor.",
      );
    }
    if (!this.sessionService.isAvailable) {
      throw new ServiceUnavailableException(
        "O navegador das buscas não está instalado no servidor.",
      );
    }
  }

  private encrypt(value: string) {
    if (!this.configuration.credentialsSecret) {
      throw new BadRequestException("Cofre de senhas não configurado.");
    }
    return encryptSecret(this.configuration.credentialsSecret, value);
  }

  private decrypt(value: string | null | undefined) {
    if (!value || !this.configuration.credentialsSecret) return null;
    return decryptSecret(this.configuration.credentialsSecret, value);
  }
}
