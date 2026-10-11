import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import * as path from "path";
import sharp from "sharp";
import { Not, Repository } from "typeorm";
import { EvolutionApiService } from "../../../infrastructure/evolution/services/evolution-api.service";
import {
  EvolutionMessage,
  EvolutionMessageStatus,
  EvolutionMessageUpdate,
  EvolutionSendMediaType,
} from "../../../infrastructure/evolution/types/evolution.type";
import { RealtimeGateway } from "../../../infrastructure/realtime/realtime.gateway";
import { StorageService } from "../../../infrastructure/storage/services/storage.service";
import { User } from "../../users/entities/user.entity";
import {
  AttachmentUploadRequestDto,
  MessageListDto,
  MessageMediaSendDto,
} from "../dtos/inbox.dto";
import { Conversation } from "../entities/conversation.entity";
import { Message } from "../entities/message.entity";
import { WhatsappConnection } from "../entities/whatsapp-connection.entity";
import {
  MEDIA_MESSAGE_TYPES,
  MessageDirection,
  MessageMediaStatus,
  MessageStatus,
  MessageType,
} from "../enums/inbox.enum";
import { parseEvolutionMessage } from "../helpers/evolution-message.parser";
import { isPersonalJid } from "../helpers/whatsapp-phone.helper";
import { InboxMapper } from "../mappers/inbox.mapper";
import { ConversationService } from "./conversation.service";
import { WhatsappConnectionService } from "./whatsapp-connection.service";

const STATUS_FROM_EVOLUTION: Record<
  EvolutionMessageStatus,
  MessageStatus | null
> = {
  ERROR: MessageStatus.FAILED,
  PENDING: MessageStatus.PENDING,
  SERVER_ACK: MessageStatus.SENT,
  DELIVERY_ACK: MessageStatus.DELIVERED,
  READ: MessageStatus.READ,
  PLAYED: MessageStatus.PLAYED,
  DELETED: null,
};

const OUTBOUND_STATUS_RANK: Partial<Record<MessageStatus, number>> = {
  [MessageStatus.PENDING]: 0,
  [MessageStatus.FAILED]: 0,
  [MessageStatus.SENT]: 1,
  [MessageStatus.DELIVERED]: 2,
  [MessageStatus.READ]: 3,
  [MessageStatus.PLAYED]: 4,
};

/** Time to let our own send finish before a "sent by me" webhook creates a copy. */
const OWN_ECHO_GRACE_MILLISECONDS = 2500;

export interface OutboundMediaRequest {
  s3Key: string;
  mimeType: string;
  fileName: string;
  sizeBytes: number | null;
  caption?: string | null;
  voice?: boolean;
  durationSeconds?: number | null;
  /** Sends a big video as a file, WhatsApp refuses large videos. */
  forceDocument?: boolean;
}

export interface OutboundOptions {
  aiGenerated?: boolean;
  presentationId?: string | null;
  propertyId?: string | null;
}

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly conversationService: ConversationService,
    private readonly connectionService: WhatsappConnectionService,
    private readonly evolutionApiService: EvolutionApiService,
    private readonly storageService: StorageService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async findAll(user: User, conversationId: string, dto: MessageListDto) {
    await this.conversationService.findEntity(user.id, conversationId);

    const query = this.messageRepository
      .createQueryBuilder("message")
      .addSelect("message.s3Key")
      .where("message.conversationId = :conversationId", { conversationId })
      .andWhere("message.userId = :userId", { userId: user.id });

    if (dto.before) {
      query.andWhere("message.sentAt < :before", {
        before: new Date(dto.before),
      });
    }

    const messages = await query
      .orderBy("message.sentAt", "DESC")
      .addOrderBy("message.createdAt", "DESC")
      .take(dto.limit + 1)
      .getMany();

    const hasMore = messages.length > dto.limit;
    const page = messages.slice(0, dto.limit).reverse();

    return {
      data: await Promise.all(page.map((message) => this.toDto(message))),
      hasMore,
    };
  }

  async mediaUrl(user: User, messageId: string, download: boolean) {
    const message = await this.messageRepository
      .createQueryBuilder("message")
      .addSelect("message.s3Key")
      .where("message.id = :messageId", { messageId })
      .andWhere("message.userId = :userId", { userId: user.id })
      .getOne();

    if (!message?.s3Key) throw new NotFoundException("Mídia não encontrada.");

    return {
      url: await this.storageService.getPresignedUrl(message.s3Key, {
        downloadFileName: download
          ? (message.fileName ?? undefined)
          : undefined,
      }),
    };
  }

  async presignAttachment(
    user: User,
    conversationId: string,
    dto: AttachmentUploadRequestDto,
  ) {
    await this.conversationService.findEntity(user.id, conversationId);
    this.storageService.validateInboxUpload(dto.mimeType, dto.sizeBytes);

    const s3Key = this.storageService.generateInboxS3Key(
      user.id,
      conversationId,
      dto.fileName,
    );
    const uploadUrl = await this.storageService.generatePresignedUploadUrl(
      s3Key,
      dto.mimeType,
    );
    return { uploadUrl, s3Key };
  }

  async sendText(
    user: User,
    conversationId: string,
    text: string,
    options: OutboundOptions = {},
  ) {
    const conversation = await this.conversationService.findEntity(
      user.id,
      conversationId,
    );
    return this.sendTextTo(conversation, text, options);
  }

  async sendMedia(
    user: User,
    conversationId: string,
    dto: MessageMediaSendDto,
  ) {
    const conversation = await this.conversationService.findEntity(
      user.id,
      conversationId,
    );

    if (
      !dto.s3Key.startsWith(
        this.storageService.inboxS3KeyPrefix(user.id, conversationId),
      )
    ) {
      throw new BadRequestException("Chave de armazenamento inválida.");
    }

    const kind = this.storageService.validateInboxUpload(
      dto.mimeType,
      dto.sizeBytes,
    );
    if (dto.voice && kind !== "audio") {
      throw new BadRequestException("Mensagem de voz precisa ser um áudio.");
    }

    const { sizeBytes } = await this.storageService.verifyObjectExists(
      dto.s3Key,
    );

    return this.sendMediaTo(conversation, { ...dto, sizeBytes }, {});
  }

  async retry(user: User, messageId: string) {
    const message = await this.messageRepository
      .createQueryBuilder("message")
      .addSelect("message.s3Key")
      .where("message.id = :messageId", { messageId })
      .andWhere("message.userId = :userId", { userId: user.id })
      .getOne();

    if (!message || message.status !== MessageStatus.FAILED) {
      throw new BadRequestException(
        "Só mensagens com falha podem ser reenviadas.",
      );
    }

    const conversation = await this.conversationService.findEntity(
      user.id,
      message.conversationId,
    );
    message.status = MessageStatus.PENDING;
    message.errorMessage = null;
    await this.messageRepository.save(message);
    await this.emitMessage("message.updated", message);

    return this.deliver(conversation, message, {});
  }

  async sendTextTo(
    conversation: Conversation,
    text: string,
    options: OutboundOptions,
  ) {
    const message = await this.createOutbound(conversation, {
      type: MessageType.TEXT,
      body: text.trim(),
      ...options,
    });
    return this.deliver(conversation, message, {});
  }

  async sendMediaTo(
    conversation: Conversation,
    media: OutboundMediaRequest,
    options: OutboundOptions,
  ) {
    const kind = this.storageService.validateInboxUpload(media.mimeType, 0);
    const typeByKind: Record<typeof kind, MessageType> = {
      image: MessageType.IMAGE,
      video: MessageType.VIDEO,
      audio: media.voice ? MessageType.VOICE : MessageType.AUDIO,
      document: MessageType.DOCUMENT,
    };

    const message = await this.createOutbound(conversation, {
      type: media.forceDocument ? MessageType.DOCUMENT : typeByKind[kind],
      body: media.caption?.trim() || null,
      s3Key: media.s3Key,
      mimeType: media.mimeType,
      fileName: media.fileName.substring(0, 255),
      sizeBytes: media.sizeBytes,
      durationSeconds: media.durationSeconds ?? null,
      mediaStatus: MessageMediaStatus.READY,
      ...options,
    });

    return this.deliver(conversation, message, {
      forceDocument: media.forceDocument,
    });
  }

  /** Stores a message that arrived or was sent from the broker's phone. */
  async handleUpsert(
    connection: WhatsappConnection,
    evolutionMessage: EvolutionMessage,
  ) {
    const key = evolutionMessage.key;
    if (!key?.id) return;

    const remoteJid = this.resolveJid(evolutionMessage);
    if (!remoteJid) return;

    const parsed = parseEvolutionMessage(evolutionMessage);
    if (!parsed) return;

    if (await this.existsByExternalId(connection.userId, key.id)) return;

    if (key.fromMe) {
      await sleep(OWN_ECHO_GRACE_MILLISECONDS);
      if (await this.existsByExternalId(connection.userId, key.id)) return;
    }

    const conversation = await this.conversationService.findOrCreateByJid(
      connection.userId,
      remoteJid,
      key.fromMe ? null : (evolutionMessage.pushName ?? null),
    );

    const isMedia = MEDIA_MESSAGE_TYPES.has(parsed.type);
    const message = this.messageRepository.create({
      userId: connection.userId,
      conversationId: conversation.id,
      externalId: key.id,
      direction: key.fromMe
        ? MessageDirection.OUTBOUND
        : MessageDirection.INBOUND,
      type: parsed.type,
      status: key.fromMe ? MessageStatus.SENT : MessageStatus.RECEIVED,
      body: parsed.body,
      mimeType: parsed.mimeType,
      fileName: parsed.fileName,
      sizeBytes: parsed.sizeBytes,
      durationSeconds: parsed.durationSeconds,
      thumbnailBase64: parsed.thumbnailBase64,
      location: parsed.location,
      quotedExternalId: parsed.quotedExternalId,
      mediaStatus: isMedia
        ? MessageMediaStatus.DOWNLOADING
        : MessageMediaStatus.NONE,
      sentAt: toDate(evolutionMessage.messageTimestamp),
    });

    try {
      await this.messageRepository.save(message);
    } catch {
      return; // Same message delivered twice by the webhook.
    }

    await this.conversationService.registerMessage(conversation, message);
    await this.emitMessage("message.created", message);

    if (isMedia) {
      void this.downloadMedia(connection, message);
    }
  }

  async handleStatusUpdate(
    connection: WhatsappConnection,
    update: EvolutionMessageUpdate,
  ) {
    const externalId = update.keyId;
    if (!externalId || !update.status) return;

    const status = STATUS_FROM_EVOLUTION[update.status];
    if (!status) return;

    const message = await this.messageRepository.findOneBy({
      userId: connection.userId,
      externalId,
    });
    if (!message || message.direction !== MessageDirection.OUTBOUND) return;

    const currentRank = OUTBOUND_STATUS_RANK[message.status] ?? 0;
    const nextRank = OUTBOUND_STATUS_RANK[status] ?? 0;
    if (status !== MessageStatus.FAILED && nextRank <= currentRank) return;

    message.status = status;
    await this.messageRepository.update(message.id, { status });
    await this.emitMessage("message.updated", message);
  }

  private async createOutbound(
    conversation: Conversation,
    fields: Partial<Message> & { type: MessageType },
  ) {
    const message = this.messageRepository.create({
      userId: conversation.userId,
      conversationId: conversation.id,
      direction: MessageDirection.OUTBOUND,
      status: MessageStatus.PENDING,
      mediaStatus: MessageMediaStatus.NONE,
      aiGenerated: false,
      sentAt: new Date(),
      ...fields,
    });
    await this.messageRepository.save(message);
    await this.conversationService.registerMessage(conversation, message);
    await this.emitMessage("message.created", message);
    return message;
  }

  /** Hands the message to Evolution and records how it went. */
  private async deliver(
    conversation: Conversation,
    message: Message,
    options: { forceDocument?: boolean },
  ) {
    try {
      const connection = await this.connectionService.requireConnected(
        conversation.userId,
      );
      const number = conversation.phone;
      let sent: EvolutionMessage;

      if (message.type === MessageType.TEXT) {
        sent = await this.evolutionApiService.sendText(
          connection.instanceName,
          number,
          message.body ?? "",
        );
      } else {
        if (!message.s3Key) throw new Error("Mídia sem arquivo.");

        if (message.type === MessageType.VOICE) {
          // Evolution adds a timestamp to audio links, which breaks the
          // presigned URL signature, so the voice note goes as base64.
          const audio = await this.storageService.downloadObject(message.s3Key);
          sent = await this.evolutionApiService.sendVoiceNote(
            connection.instanceName,
            number,
            audio.toString("base64"),
          );
        } else if (
          message.type === MessageType.IMAGE &&
          IMAGES_SENT_AS_JPEG.has(baseMimeType(message.mimeType))
        ) {
          // WhatsApp refuses these formats, so they go as a JPEG.
          const original = await this.storageService.downloadObject(
            message.s3Key,
          );
          const jpeg = await sharp(original)
            .rotate()
            .flatten({ background: "#ffffff" })
            .jpeg({ quality: 90 })
            .toBuffer();
          sent = await this.evolutionApiService.sendMedia(
            connection.instanceName,
            number,
            {
              mediatype: "image",
              mimetype: "image/jpeg",
              media: jpeg.toString("base64"),
              caption: message.body,
              fileName: `${path.parse(message.fileName ?? "foto").name}.jpg`,
            },
          );
        } else {
          const url = await this.storageService.getPresignedUrl(message.s3Key, {
            expiresInSeconds: 60 * 60,
          });
          const mediaTypeByMessage: Partial<
            Record<MessageType, EvolutionSendMediaType>
          > = {
            [MessageType.IMAGE]: "image",
            [MessageType.VIDEO]: "video",
            [MessageType.AUDIO]: "audio",
          };
          const mediatype = options.forceDocument
            ? "document"
            : (mediaTypeByMessage[message.type] ?? "document");

          sent = await this.evolutionApiService.sendMedia(
            connection.instanceName,
            number,
            {
              mediatype,
              mimetype: baseMimeType(message.mimeType),
              media: url,
              caption: message.body,
              fileName:
                message.fileName ?? withExtension("arquivo", message.mimeType),
            },
          );
        }
      }

      await this.attachExternalId(message, sent?.key?.id ?? null);
      message.status = MessageStatus.SENT;
      message.errorMessage = null;
    } catch (error) {
      this.logger.warn(`Message ${message.id} failed: ${String(error)}`);
      message.status = MessageStatus.FAILED;
      message.errorMessage =
        error instanceof Error
          ? error.message.substring(0, 255)
          : "Falha no envio";
    }

    await this.messageRepository.update(message.id, {
      status: message.status,
      externalId: message.externalId,
      errorMessage: message.errorMessage,
    });
    return this.emitMessage("message.updated", message);
  }

  /** Drops the copy the webhook may have stored before the send returned. */
  private async attachExternalId(message: Message, externalId: string | null) {
    if (!externalId) return;
    const echo = await this.messageRepository.findOneBy({
      userId: message.userId,
      externalId,
      id: Not(message.id),
    });
    if (echo) {
      await this.messageRepository.delete(echo.id);
      this.realtimeGateway.emitToUser(message.userId, "message.removed", {
        id: echo.id,
        conversationId: echo.conversationId,
      });
    }
    message.externalId = externalId;
  }

  private async downloadMedia(
    connection: WhatsappConnection,
    message: Message,
  ) {
    try {
      const isAudio =
        message.type === MessageType.AUDIO ||
        message.type === MessageType.VOICE;
      const media = await this.evolutionApiService.downloadMedia(
        connection.instanceName,
        message.externalId as string,
        isAudio,
      );
      if (!media?.base64) throw new Error("Evolution returned no media");

      const mimeType =
        (isAudio && media.mimetype) ||
        message.mimeType ||
        media.mimetype ||
        "application/octet-stream";
      const buffer = Buffer.from(media.base64, "base64");
      const s3Key = this.storageService.generateInboxS3Key(
        message.userId,
        message.conversationId,
        message.fileName ?? media.fileName ?? withExtension("midia", mimeType),
      );
      await this.storageService.uploadBuffer(
        s3Key,
        buffer,
        mimeType.split(";")[0],
      );

      message.s3Key = s3Key;
      message.mimeType = mimeType;
      message.sizeBytes = buffer.length;
      message.mediaStatus = MessageMediaStatus.READY;
    } catch (error) {
      this.logger.warn(
        `Media of message ${message.id} not downloaded: ${String(error)}`,
      );
      message.mediaStatus = MessageMediaStatus.FAILED;
    }

    await this.messageRepository.update(message.id, {
      s3Key: message.s3Key,
      mimeType: message.mimeType,
      sizeBytes: message.sizeBytes,
      mediaStatus: message.mediaStatus,
    });
    await this.emitMessage("message.updated", message);
  }

  /** Personal chats only. Hidden numbers (@lid) use the real number Evolution sends along. */
  private resolveJid(message: EvolutionMessage) {
    const key = message.key;
    const candidates = [key.remoteJid, key.remoteJidAlt, key.senderPn];
    return candidates.find((jid) => isPersonalJid(jid)) ?? null;
  }

  private existsByExternalId(userId: string, externalId: string) {
    return this.messageRepository.existsBy({ userId, externalId });
  }

  private async toDto(message: Message) {
    const mediaUrl = message.s3Key
      ? await this.storageService.getPresignedUrl(message.s3Key, {
          expiresInSeconds: 6 * 60 * 60,
        })
      : null;
    return InboxMapper.toMessageDto(message, mediaUrl);
  }

  private async emitMessage(
    event: "message.created" | "message.updated",
    message: Message,
  ) {
    const dto = await this.toDto(message);
    this.realtimeGateway.emitToUser(message.userId, event, dto);
    return dto;
  }
}

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const toDate = (timestamp: number | string | undefined) => {
  const seconds = Number(timestamp);
  return Number.isFinite(seconds) && seconds > 0
    ? new Date(seconds * 1000)
    : new Date();
};

/** Image formats WhatsApp does not take, converted to JPEG on the way out. */
const IMAGES_SENT_AS_JPEG = new Set(["image/webp"]);

const baseMimeType = (mimeType: string | null) =>
  (mimeType ?? "application/octet-stream").split(";")[0].trim().toLowerCase();

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "audio/ogg": ".ogg",
  "audio/mp4": ".m4a",
  "audio/mpeg": ".mp3",
  "audio/webm": ".webm",
  "application/pdf": ".pdf",
};

const withExtension = (name: string, mimeType: string | null) => {
  const base = (mimeType ?? "").split(";")[0].trim();
  return `${name}${EXTENSION_BY_MIME_TYPE[base] ?? path.extname(name)}`;
};

export const newPresentationId = () => randomUUID();
