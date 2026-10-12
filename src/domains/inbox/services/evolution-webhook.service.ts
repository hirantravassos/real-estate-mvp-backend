import { Injectable, Logger } from "@nestjs/common";
import {
  EvolutionConnectionUpdate,
  EvolutionHistoryChat,
  EvolutionMessage,
  EvolutionMessageUpdate,
  EvolutionQrCodeUpdate,
  EvolutionWebhookPayload,
} from "../../../infrastructure/evolution/types/evolution.type";
import { WhatsappConnection } from "../entities/whatsapp-connection.entity";
import { MessageService } from "./message.service";
import { WhatsappConnectionService } from "./whatsapp-connection.service";
import { WhatsappHistorySyncService } from "./whatsapp-history-sync.service";

/** "MESSAGES_UPSERT", "messages.upsert" and "messages-upsert" all become "messages.upsert". */
const normalizeEvent = (event: string) =>
  event.toLowerCase().replace(/[_-]/g, ".");

const asList = <T>(data: unknown): T[] =>
  (Array.isArray(data) ? data : [data]).filter(Boolean) as T[];

@Injectable()
export class EvolutionWebhookService {
  private readonly logger = new Logger(EvolutionWebhookService.name);

  constructor(
    private readonly connectionService: WhatsappConnectionService,
    private readonly messageService: MessageService,
    private readonly historySyncService: WhatsappHistorySyncService,
  ) {}

  async handle(token: string, payload: EvolutionWebhookPayload) {
    const connection = await this.connectionService.findByWebhookToken(token);
    if (!connection) return false;
    if (payload.instance && payload.instance !== connection.instanceName) {
      return false;
    }

    void this.dispatch(connection, payload).catch((error: unknown) => {
      this.logger.error(
        `Webhook ${payload.event} failed: ${String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    });
    return true;
  }

  private async dispatch(
    connection: WhatsappConnection,
    payload: EvolutionWebhookPayload,
  ) {
    switch (normalizeEvent(payload.event ?? "")) {
      case "qrcode.updated":
        await this.connectionService.handleQrCodeUpdate(
          connection,
          payload.data as EvolutionQrCodeUpdate,
        );
        return;
      case "connection.update":
        await this.connectionService.handleConnectionUpdate(
          connection,
          payload.data as EvolutionConnectionUpdate,
        );
        return;
      case "messages.upsert":
        for (const message of asList<EvolutionMessage>(payload.data)) {
          await this.messageService.handleUpsert(connection, message);
        }
        return;
      case "messages.update":
        for (const update of asList<EvolutionMessageUpdate>(payload.data)) {
          await this.messageService.handleStatusUpdate(connection, update);
        }
        return;
      case "chats.set":
        await this.historySyncService.handleChats(
          connection,
          asList<EvolutionHistoryChat>(payload.data),
        );
        return;
      case "messages.set":
        await this.historySyncService.handleMessages(
          connection,
          asList<EvolutionMessage>(payload.data),
          typeof payload.progress === "number" ? payload.progress : null,
        );
        return;
      default:
        return;
    }
  }
}
