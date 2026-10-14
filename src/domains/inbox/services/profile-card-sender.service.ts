import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { StorageService } from "../../../infrastructure/storage/services/storage.service";
import { User } from "../../users/entities/user.entity";
import { ProfileCardSendDto } from "../dtos/inbox.dto";
import { Conversation } from "../entities/conversation.entity";
import { ConversationService } from "./conversation.service";
import { MessageService } from "./message.service";
import { WhatsappConnectionService } from "./whatsapp-connection.service";

/** The card is drawn at 1080 x 1350, anything far above it is not a card. */
const MAXIMUM_CARD_SIDE_PIXELS = 2400;
const CARD_FILE_NAME = "cartao-do-corretor.jpg";
const CARD_MIME_TYPE = "image/jpeg";
const NAME_PLACEHOLDER = /\{nome\}/gi;

/**
 * Sends the broker's profile card from their own WhatsApp to the chats they
 * picked. Every message goes through the inbox, so the WhatsApp safety
 * queue paces it and the chat shows it like any other send.
 */
@Injectable()
export class ProfileCardSenderService {
  private readonly logger = new Logger(ProfileCardSenderService.name);

  constructor(
    private readonly conversationService: ConversationService,
    private readonly connectionService: WhatsappConnectionService,
    private readonly messageService: MessageService,
    private readonly storageService: StorageService,
  ) {}

  async send(user: User, dto: ProfileCardSendDto) {
    await this.connectionService.requireConnected(user.id);
    // Each id is scoped to the broker, a chat of another account is a 404.
    const conversations: Conversation[] = [];
    for (const conversationId of dto.conversationIds) {
      conversations.push(
        await this.conversationService.findEntity(user.id, conversationId),
      );
    }
    const card = await this.cleanCard(dto.image);

    const sendId = randomUUID();
    void this.deliver(user.id, conversations, card, dto.caption, sendId);

    return { sendId, total: conversations.length };
  }

  /**
   * The image comes from the browser, so it is decoded and drawn again as a
   * plain JPEG: anything that is not a real picture is refused and nothing
   * but the pixels reaches WhatsApp.
   */
  private async cleanCard(base64: string) {
    try {
      const image = sharp(Buffer.from(base64, "base64"), {
        limitInputPixels: MAXIMUM_CARD_SIDE_PIXELS * MAXIMUM_CARD_SIDE_PIXELS,
      });
      const { format, width = 0, height = 0 } = await image.metadata();
      if (
        !format ||
        !["png", "jpeg", "webp"].includes(format) ||
        width > MAXIMUM_CARD_SIDE_PIXELS ||
        height > MAXIMUM_CARD_SIDE_PIXELS
      ) {
        throw new Error(`Unexpected card ${format} ${width}x${height}`);
      }
      return await image
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 90 })
        .toBuffer();
    } catch (error) {
      this.logger.warn(`Profile card refused: ${String(error)}`);
      throw new BadRequestException(
        "Não deu para ler a imagem do cartão. Gere de novo e tente outra vez.",
      );
    }
  }

  private async deliver(
    userId: string,
    conversations: Conversation[],
    card: Buffer,
    caption: string,
    sendId: string,
  ) {
    const deliveries = conversations.map(async (conversation) => {
      // One copy per chat, so erasing a chat never breaks the card in another.
      const s3Key = this.storageService.generateInboxS3Key(
        userId,
        conversation.id,
        CARD_FILE_NAME,
      );
      await this.storageService.uploadBuffer(s3Key, card, CARD_MIME_TYPE);
      await this.messageService.sendMediaTo(
        conversation,
        {
          s3Key,
          mimeType: CARD_MIME_TYPE,
          fileName: CARD_FILE_NAME,
          sizeBytes: card.length,
          caption: personalize(caption, firstNameOf(conversation)),
        },
        {},
      );
    });

    const results = await Promise.allSettled(deliveries);
    const failed = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (failed.length) {
      this.logger.warn(
        `Profile card ${sendId}: ${failed.length} of ${results.length} chats failed, first: ${String(failed[0].reason)}`,
      );
    }
  }
}

const firstNameOf = (conversation: Conversation) => {
  const name = conversation.customer?.name ?? conversation.contactName;
  return name?.trim().split(/\s+/)[0] || null;
};

/** "Oi, {nome}!" becomes "Oi, Ana!", or "Oi!" when the contact has no name. */
export const personalize = (caption: string, firstName: string | null) => {
  const text = firstName
    ? caption.replace(NAME_PLACEHOLDER, firstName)
    : caption
        .replace(/[ \t]*,?[ \t]*\{nome\}/gi, "")
        .replace(/^[ \t]*[,!][ \t]*/gm, "");
  return text.trim();
};
