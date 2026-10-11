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
import { RealtimeGateway } from "../../../infrastructure/realtime/realtime.gateway";
import { User } from "../../users/entities/user.entity";
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

/** A signed in session ready for a hunt, the broker's own or the platform's. */
export interface PortalSession {
  account: PortalAccount;
  storageState: string | null;
}

/**
 * Keeps the portal logins, encrypted, and their signed in sessions. A
 * broker's own account always wins over the platform account.
 */
@Injectable()
export class PortalAccountService {
  constructor(
    @Inject(portalsConfig.KEY)
    private readonly configuration: ConfigType<typeof portalsConfig>,
    @InjectRepository(PortalAccount)
    private readonly accountRepository: Repository<PortalAccount>,
    private readonly sessionService: PortalSessionService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async listForUser(user: User) {
    const [own, platform] = await Promise.all([
      this.accountRepository.find({ where: { userId: user.id, active: true } }),
      this.accountRepository.find({
        where: {
          userId: IsNull(),
          active: true,
          status: PortalAccountStatus.CONNECTED,
        },
      }),
    ]);
    return {
      browserReady: this.sessionService.isAvailable,
      portals: PORTAL_KEYS.map((portal) =>
        PropertyHuntMapper.toPortalDto(
          portal,
          own.find((account) => account.portal === portal) ?? null,
          platform.some((account) => account.portal === portal),
        ),
      ),
    };
  }

  async listPlatform() {
    const accounts = await this.accountRepository.find({
      where: { userId: IsNull(), active: true },
    });
    return PORTAL_KEYS.map((portal) =>
      PropertyHuntMapper.toPortalDto(
        portal,
        accounts.find((account) => account.portal === portal) ?? null,
        false,
      ),
    );
  }

  /** Saves the login and signs in right away, so the broker sees it working. */
  async connect(
    userId: string | null,
    portal: PortalKey,
    dto: PortalAccountSaveDto,
  ) {
    this.ensureReady();
    const account =
      (await this.findAccount(userId, portal, true)) ??
      this.accountRepository.create({
        userId,
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

  async submitCode(userId: string | null, portal: PortalKey, code: string) {
    const account = await this.findAccount(userId, portal);
    if (!account)
      throw new NotFoundException("Conta do portal não encontrada.");
    const result = await this.sessionService.submitCode(account.id, code);
    return this.applySignIn(account, result);
  }

  /** Signs in again with the saved password, to test or refresh the session. */
  async check(userId: string | null, portal: PortalKey) {
    this.ensureReady();
    const account = await this.findAccount(userId, portal, true);
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

  async remove(userId: string | null, portal: PortalKey) {
    const account = await this.findAccount(userId, portal);
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
    if (userId) this.notify(userId);
  }

  /** The session a hunt uses on this portal, or null to browse signed out. */
  async sessionFor(
    userId: string,
    portal: PortalKey,
  ): Promise<PortalSession | null> {
    const candidates = [
      await this.findAccount(userId, portal, true),
      await this.findAccount(null, portal, true),
    ];
    const account = candidates.find(
      (candidate) =>
        candidate &&
        (candidate.status === PortalAccountStatus.CONNECTED ||
          candidate.passwordCipher),
    );
    if (!account) return null;
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
    await this.applySignIn(account, result, false);
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
    if (account.userId) this.notify(account.userId);
  }

  private async applySignIn(
    account: PortalAccount,
    result: SignInResult,
    notify = true,
  ) {
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
    if (notify && account.userId) this.notify(account.userId);
    return PropertyHuntMapper.toPortalDto(account.portal, account, false);
  }

  private async findAccount(
    userId: string | null,
    portal: PortalKey,
    withSecrets = false,
  ) {
    const query = this.accountRepository
      .createQueryBuilder("account")
      .where("account.portal = :portal", { portal })
      .andWhere("account.active = :active", { active: true })
      .orderBy("account.updatedAt", "DESC");
    if (userId) query.andWhere("account.userId = :userId", { userId });
    else query.andWhere("account.userId IS NULL");
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

  private notify(userId: string) {
    this.realtimeGateway.emitToUser(userId, "portal-accounts.updated", {});
  }
}
