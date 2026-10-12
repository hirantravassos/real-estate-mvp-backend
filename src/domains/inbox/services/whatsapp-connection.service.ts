import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomBytes } from "crypto";
import { Repository } from "typeorm";
import { EvolutionApiService } from "../../../infrastructure/evolution/services/evolution-api.service";
import { EvolutionThrottleService } from "../../../infrastructure/evolution/services/evolution-throttle.service";
import {
  EvolutionConnectionUpdate,
  EvolutionQrCode,
  EvolutionQrCodeUpdate,
} from "../../../infrastructure/evolution/types/evolution.type";
import { RealtimeGateway } from "../../../infrastructure/realtime/realtime.gateway";
import { User } from "../../users/entities/user.entity";
import { WhatsappConnection } from "../entities/whatsapp-connection.entity";
import { WhatsappConnectionStatus } from "../enums/inbox.enum";
import {
  numberFromJid,
  toCustomerPhone,
  toWhatsappNumber,
} from "../helpers/whatsapp-phone.helper";
import { InboxMapper } from "../mappers/inbox.mapper";

/** WhatsApp answers 401 when the phone removed the linked device. */
const LOGGED_OUT_STATUS_REASON = 401;

/** WhatsApp answers 403 when it restricted or banned the number. */
const FORBIDDEN_STATUS_REASON = 403;

@Injectable()
export class WhatsappConnectionService {
  private readonly logger = new Logger(WhatsappConnectionService.name);

  constructor(
    @InjectRepository(WhatsappConnection)
    private readonly connectionRepository: Repository<WhatsappConnection>,
    private readonly evolutionApiService: EvolutionApiService,
    private readonly throttleService: EvolutionThrottleService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async status(user: User) {
    let connection = await this.connectionRepository.findOneBy({
      userId: user.id,
    });

    if (connection && this.evolutionApiService.isConfigured) {
      connection = await this.syncState(connection);
    }

    return InboxMapper.toConnectionDto(
      connection,
      this.evolutionApiService.isConfigured,
    );
  }

  /**
   * Creates the Evolution instance when needed and returns a fresh QR code.
   * With a phone it also returns a pairing code, for brokers who only have
   * the phone itself and so can't scan a QR code on its own screen.
   */
  async connect(user: User, phone?: string | null) {
    const pairingNumber = phone ? this.pairingNumberOf(phone) : null;
    const connection = await this.findOrCreate(user.id);
    this.throttleService.assertConnectAttempt(connection.instanceName);
    const token = await this.webhookTokenOf(connection.id);
    const webhookUrl = this.evolutionApiService.webhookUrlFor(token);

    let qrCode: EvolutionQrCode | undefined;

    let exists = await this.evolutionApiService.instanceExists(
      connection.instanceName,
    );

    if (exists) {
      await this.evolutionApiService.setWebhook(
        connection.instanceName,
        webhookUrl,
      );
      const state = await this.evolutionApiService.connectionState(
        connection.instanceName,
      );
      if (state === "open") {
        return this.status(user);
      }
      // Evolution only asks WhatsApp for a pairing code on a fresh socket, so the instance starts over.
      if (pairingNumber) {
        await this.resetInstance(connection.instanceName);
        exists = false;
      }
    }

    if (!exists) {
      const created = await this.evolutionApiService.createInstance(
        connection.instanceName,
        webhookUrl,
        pairingNumber,
      );
      qrCode = created?.qrcode;
    } else {
      // History only syncs on pairing, so the settings must land before the QR code.
      await this.evolutionApiService
        .applySettings(connection.instanceName)
        .catch((error: unknown) => {
          this.logger.warn(`Apply settings failed: ${String(error)}`);
        });
    }

    if (!qrCode?.base64 && !qrCode?.pairingCode) {
      qrCode = await this.evolutionApiService.connect(
        connection.instanceName,
        pairingNumber,
      );
    }

    connection.status = WhatsappConnectionStatus.CONNECTING;
    connection.qrCode = null;
    connection.pairingCode = null;
    this.applyQrCode(connection, qrCode);
    await this.save(connection);

    return InboxMapper.toConnectionDto(connection, true);
  }

  async disconnect(user: User) {
    const connection = await this.connectionRepository.findOneBy({
      userId: user.id,
    });
    if (!connection) return this.status(user);

    await this.evolutionApiService.logout(connection.instanceName);
    await this.evolutionApiService
      .deleteInstance(connection.instanceName)
      .catch((error: unknown) => {
        this.logger.warn(`Delete instance failed: ${String(error)}`);
      });

    connection.status = WhatsappConnectionStatus.DISCONNECTED;
    connection.qrCode = null;
    connection.pairingCode = null;
    connection.connectedAt = null;
    await this.save(connection);

    return InboxMapper.toConnectionDto(connection, true);
  }

  async findByWebhookToken(token: string) {
    if (!token || token.length !== 64) return null;
    return this.connectionRepository
      .createQueryBuilder("connection")
      .where("connection.webhookToken = :token", { token })
      .getOne();
  }

  async requireConnected(userId: string) {
    const connection = await this.connectionRepository.findOneBy({ userId });
    if (
      !connection ||
      connection.status !== WhatsappConnectionStatus.CONNECTED
    ) {
      throw new ConflictException(
        "Conecte o seu WhatsApp para enviar mensagens.",
      );
    }
    return connection;
  }

  async handleConnectionUpdate(
    connection: WhatsappConnection,
    update: EvolutionConnectionUpdate,
  ) {
    if (update.state === "open") {
      this.throttleService.resume(connection.instanceName);
      connection.status = WhatsappConnectionStatus.CONNECTED;
      connection.qrCode = null;
      connection.pairingCode = null;
      connection.connectedAt = connection.connectedAt ?? new Date();
      if (update.wuid) connection.phone = numberFromJid(update.wuid);
      if (update.profileName) connection.profileName = update.profileName;
      if (update.profilePictureUrl) {
        connection.profilePictureUrl = update.profilePictureUrl;
      }
    } else if (update.state === "connecting") {
      this.throttleService.suspend(connection.instanceName);
      connection.status = WhatsappConnectionStatus.CONNECTING;
      connection.connectedAt = null;
    } else if (update.state === "close") {
      this.throttleService.suspend(connection.instanceName);
      if (update.statusReason === FORBIDDEN_STATUS_REASON) {
        this.logger.error(
          `WhatsApp refused ${connection.instanceName} (403), the number may be restricted or banned`,
        );
      }
      connection.status = WhatsappConnectionStatus.DISCONNECTED;
      connection.connectedAt = null;
      if (update.statusReason === LOGGED_OUT_STATUS_REASON) {
        connection.qrCode = null;
        connection.pairingCode = null;
      }
    }
    await this.save(connection);
  }

  async handleQrCodeUpdate(
    connection: WhatsappConnection,
    update: EvolutionQrCodeUpdate,
  ) {
    if (!update.qrcode?.base64 && !update.qrcode?.pairingCode) return;
    connection.status = WhatsappConnectionStatus.CONNECTING;
    this.applyQrCode(connection, update.qrcode);
    await this.save(connection);
  }

  private async syncState(connection: WhatsappConnection) {
    const state = await this.evolutionApiService
      .connectionState(connection.instanceName)
      .catch(() => null);
    if (!state) return connection;

    const expected: Record<string, WhatsappConnectionStatus> = {
      open: WhatsappConnectionStatus.CONNECTED,
      connecting: WhatsappConnectionStatus.CONNECTING,
      close: WhatsappConnectionStatus.DISCONNECTED,
    };

    if (expected[state] === connection.status) return connection;

    if (state === "open") {
      const information = await this.evolutionApiService
        .fetchInstance(connection.instanceName)
        .catch(() => null);
      await this.handleConnectionUpdate(connection, {
        state,
        wuid: information?.ownerJid ?? undefined,
        profileName: information?.profileName ?? undefined,
        profilePictureUrl: information?.profilePicUrl ?? undefined,
      });
    } else {
      await this.handleConnectionUpdate(connection, { state });
    }
    return connection;
  }

  private applyQrCode(
    connection: WhatsappConnection,
    qrCode: EvolutionQrCode | undefined,
  ) {
    if (!qrCode?.base64 && !qrCode?.pairingCode) return;
    if (qrCode.base64) {
      connection.qrCode = qrCode.base64.startsWith("data:")
        ? qrCode.base64
        : `data:image/png;base64,${qrCode.base64}`;
    }
    connection.pairingCode = qrCode.pairingCode ?? null;
    connection.qrCodeUpdatedAt = new Date();
  }

  /** "(11) 9 1234-5678" becomes "5511912345678", the number WhatsApp pairs with. */
  private pairingNumberOf(phone: string) {
    const customerPhone = toCustomerPhone(phone);
    if (!customerPhone) {
      throw new BadRequestException(
        "Informe o número do seu WhatsApp com DDD, como (11) 9 1234-5678.",
      );
    }
    return toWhatsappNumber(customerPhone);
  }

  /** Drops an instance that never finished pairing, so the next one starts clean. */
  private async resetInstance(instanceName: string) {
    await this.evolutionApiService.logout(instanceName);
    await this.evolutionApiService
      .deleteInstance(instanceName)
      .catch((error: unknown) => {
        this.logger.warn(`Delete instance failed: ${String(error)}`);
      });
  }

  private async findOrCreate(userId: string) {
    const existing = await this.connectionRepository.findOneBy({ userId });
    if (existing) return existing;

    return this.connectionRepository.save(
      this.connectionRepository.create({
        userId,
        instanceName: this.evolutionApiService.instanceNameFor(userId),
        webhookToken: randomBytes(32).toString("hex"),
        status: WhatsappConnectionStatus.DISCONNECTED,
      }),
    );
  }

  private async webhookTokenOf(connectionId: string) {
    const connection = await this.connectionRepository
      .createQueryBuilder("connection")
      .addSelect("connection.webhookToken")
      .where("connection.id = :connectionId", { connectionId })
      .getOneOrFail();
    return connection.webhookToken;
  }

  private async save(connection: WhatsappConnection) {
    await this.connectionRepository.save(connection);
    this.realtimeGateway.emitToUser(
      connection.userId,
      "connection.updated",
      InboxMapper.toConnectionDto(connection, true),
    );
  }
}
