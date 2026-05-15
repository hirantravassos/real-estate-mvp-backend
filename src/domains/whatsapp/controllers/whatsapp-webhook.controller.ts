import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Logger,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { WhatsappChatService, InboundMessagePayload, StatusUpdatePayload } from "../services/whatsapp-chat.service";
import { verifyWebhookSignature } from "../utils/encryption.util";

interface WebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: { display_phone_number: string; phone_number_id: string };
      contacts?: Array<{ profile: { name: string }; wa_id: string }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        type: string;
        text?: { body: string };
        image?: { id: string; mime_type: string; sha256: string; caption?: string };
        audio?: { id: string; mime_type: string };
        video?: { id: string; mime_type: string; caption?: string };
        document?: { id: string; mime_type: string; filename?: string };
        sticker?: { id: string; mime_type: string };
      }>;
      statuses?: Array<{
        id: string;
        status: "sent" | "delivered" | "read" | "failed";
        timestamp: string;
        recipient_id: string;
      }>;
    };
    field: string;
  }>;
}

interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

@Controller("whatsapp/webhook")
export class WhatsappWebhookController {
  private readonly logger = new Logger(WhatsappWebhookController.name);

  constructor(
    private readonly chatService: WhatsappChatService,
    private readonly configService: ConfigService,
  ) {}

  /** Meta webhook verification handshake */
  @Get()
  verify(
    @Query("hub.mode") mode: string,
    @Query("hub.verify_token") token: string,
    @Query("hub.challenge") challenge: string,
  ): string {
    const expectedToken = this.configService.get<string>(
      "whatsapp.webhookVerifyToken",
    );

    if (mode === "subscribe" && token === expectedToken) {
      this.logger.log("Webhook verified successfully");
      return challenge;
    }

    throw new UnauthorizedException("Webhook verification failed");
  }

  /** Receive events from Meta */
  @Post()
  @HttpCode(200)
  async receive(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers("x-hub-signature-256") signature: string,
    @Body() payload: WebhookPayload,
  ): Promise<{ status: string }> {
    const rawBody = req.rawBody;
    const appSecret = this.configService.get<string>("whatsapp.appSecret", "");

    if (appSecret && rawBody) {
      const valid = verifyWebhookSignature(rawBody, signature ?? "", appSecret);
      if (!valid) {
        this.logger.warn("Invalid webhook signature received");
        throw new UnauthorizedException("Invalid signature");
      }
    }

    if (payload.object !== "whatsapp_business_account") {
      throw new BadRequestException("Unknown webhook object type");
    }

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages") continue;

        const { value } = change;
        const { phone_number_id: phoneNumberId } = value.metadata;
        const wabaId = entry.id;

        for (const message of value.messages ?? []) {
          const contact = value.contacts?.find((c) => c.wa_id === message.from);
          const inbound: InboundMessagePayload = {
            phoneNumberId,
            wabaId,
            from: message.from,
            contactName: contact?.profile?.name ?? null,
            metaMessageId: message.id,
            type: message.type,
            body: message.text?.body ?? null,
            mediaUrl: null,
            mediaType:
              message.image?.mime_type ??
              message.audio?.mime_type ??
              message.video?.mime_type ??
              message.document?.mime_type ??
              null,
            timestamp: parseInt(message.timestamp, 10),
          };

          await this.chatService.enqueueInboundMessage(inbound);
        }

        for (const status of value.statuses ?? []) {
          const update: StatusUpdatePayload = {
            metaMessageId: status.id,
            status: status.status,
            timestamp: parseInt(status.timestamp, 10),
          };
          await this.chatService.processStatusUpdate(update);
        }
      }
    }

    return { status: "ok" };
  }
}
