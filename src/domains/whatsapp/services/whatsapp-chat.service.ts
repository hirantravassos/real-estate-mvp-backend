import {
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { User } from "../../users/entities/user.entity";
import { WhatsappChatRepository } from "../repositories/whatsapp-chat.repository";
import { WhatsappContactRepository } from "../repositories/whatsapp-contact.repository";
import { WhatsappMessageRepository } from "../repositories/whatsapp-message.repository";
import { WhatsappAccountService, WhatsappSendMessageDto } from "./whatsapp-account.service";
import {
  WhatsappMessage,
  WhatsappMessageDirection,
  WhatsappMessageStatus,
  WhatsappMessageType,
} from "../entities/whatsapp-message.entity";
import { WhatsappChat } from "../entities/whatsapp-chat.entity";
import { WhatsappContact } from "../entities/whatsapp-contact.entity";
import {
  WHATSAPP_INBOUND_QUEUE,
  PROCESS_INBOUND_MESSAGE,
} from "../whatsapp.constants";
import { WhatsappApiService } from "./whatsapp-api.service";

export interface InboundMessagePayload {
  phoneNumberId: string;
  wabaId: string;
  from: string;
  contactName: string | null;
  metaMessageId: string;
  type: string;
  body: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  timestamp: number;
}

export interface StatusUpdatePayload {
  metaMessageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: number;
}

@Injectable()
export class WhatsappChatService {
  private readonly logger = new Logger(WhatsappChatService.name);

  constructor(
    private readonly chatRepository: WhatsappChatRepository,
    private readonly contactRepository: WhatsappContactRepository,
    private readonly messageRepository: WhatsappMessageRepository,
    private readonly accountService: WhatsappAccountService,
    private readonly apiService: WhatsappApiService,
    @InjectQueue(WHATSAPP_INBOUND_QUEUE)
    private readonly inboundQueue: Queue,
  ) {}

  async findAllChats(user: User) {
    return this.chatRepository.find({
      where: { userId: user.id, active: true },
      relations: { contact: true },
      order: { lastMessageAt: "DESC" },
    });
  }

  async findChat(user: User, chatId: string): Promise<WhatsappChat> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId, userId: user.id, active: true },
      relations: { contact: true },
    });
    if (!chat) throw new NotFoundException("Chat not found");
    return chat;
  }

  async getMessages(user: User, chatId: string, limit = 50, offset = 0) {
    await this.findChat(user, chatId);

    const [messages, total] = await this.messageRepository.findAndCount({
      where: { chatId, active: true },
      order: { sentAt: "DESC", createdAt: "DESC" },
      take: limit,
      skip: offset,
    });

    return { data: messages.reverse(), total };
  }

  async sendMessage(
    user: User,
    chatId: string,
    dto: WhatsappSendMessageDto,
  ): Promise<WhatsappMessage> {
    const chat = await this.findChat(user, chatId);
    const account = await this.accountService.findActiveAccountByPhoneNumberId(
      chat.whatsappAccountId,
    );

    if (!account) throw new NotFoundException("WhatsApp account not found");

    const token = this.accountService.decryptAccountToken(account);

    const result = await this.apiService.sendTextMessage(
      account.phoneNumberId!,
      token,
      chat.contact.waId,
      dto.text,
    );

    const message = this.messageRepository.create({
      chatId: chat.id,
      metaMessageId: result.messages[0]?.id ?? null,
      direction: WhatsappMessageDirection.OUTBOUND,
      type: WhatsappMessageType.TEXT,
      body: dto.text,
      fromNumber: account.displayPhoneNumber,
      toNumber: chat.contact.waId,
      status: WhatsappMessageStatus.SENT,
      sentAt: new Date(),
    });

    const saved = await this.messageRepository.save(message);

    chat.lastMessageAt = new Date();
    await this.chatRepository.save(chat);

    return saved;
  }

  async enqueueInboundMessage(payload: InboundMessagePayload): Promise<void> {
    await this.inboundQueue.add(PROCESS_INBOUND_MESSAGE, payload, {
      removeOnComplete: 100,
      removeOnFail: 500,
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    });
  }

  async processInboundMessage(payload: InboundMessagePayload): Promise<void> {
    const account =
      await this.accountService.findActiveAccountByPhoneNumberId(
        payload.phoneNumberId,
      );

    if (!account) {
      this.logger.warn(
        `Received message for unknown phone number ID: ${payload.phoneNumberId}`,
      );
      return;
    }

    let contact = await this.contactRepository.findOne({
      where: {
        whatsappAccountId: account.id,
        waId: payload.from,
      },
    });

    if (!contact) {
      contact = this.contactRepository.create({
        userId: account.userId,
        whatsappAccountId: account.id,
        waId: payload.from,
        name: payload.contactName,
      } as WhatsappContact);
      contact = await this.contactRepository.save(contact);
    } else if (payload.contactName && contact.name !== payload.contactName) {
      contact.name = payload.contactName;
      contact = await this.contactRepository.save(contact);
    }

    let chat = await this.chatRepository.findOne({
      where: {
        whatsappAccountId: account.id,
        contactId: contact.id,
      },
    });

    if (!chat) {
      chat = this.chatRepository.create({
        userId: account.userId,
        whatsappAccountId: account.id,
        contactId: contact.id,
      } as WhatsappChat);
      chat = await this.chatRepository.save(chat);
    }

    const existingMessage = await this.messageRepository.findOne({
      where: { metaMessageId: payload.metaMessageId },
    });

    if (existingMessage) return;

    const message = this.messageRepository.create({
      chatId: chat.id,
      metaMessageId: payload.metaMessageId,
      direction: WhatsappMessageDirection.INBOUND,
      type: this.normalizeType(payload.type),
      body: payload.body,
      mediaUrl: payload.mediaUrl,
      mediaType: payload.mediaType,
      fromNumber: payload.from,
      toNumber: account.displayPhoneNumber,
      status: WhatsappMessageStatus.DELIVERED,
      sentAt: new Date(payload.timestamp * 1000),
    } as WhatsappMessage);

    await this.messageRepository.save(message);

    chat.lastMessageAt = new Date(payload.timestamp * 1000);
    chat.unreadCount = (chat.unreadCount ?? 0) + 1;
    await this.chatRepository.save(chat);

    this.logger.log(
      `Stored inbound message ${payload.metaMessageId} from ${payload.from}`,
    );
  }

  async processStatusUpdate(payload: StatusUpdatePayload): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { metaMessageId: payload.metaMessageId },
    });

    if (!message) return;

    const statusMap: Record<string, WhatsappMessageStatus> = {
      sent: WhatsappMessageStatus.SENT,
      delivered: WhatsappMessageStatus.DELIVERED,
      read: WhatsappMessageStatus.READ,
      failed: WhatsappMessageStatus.FAILED,
    };

    message.status = statusMap[payload.status] ?? message.status;
    await this.messageRepository.save(message);
  }

  private normalizeType(raw: string): WhatsappMessageType {
    const map: Record<string, WhatsappMessageType> = {
      text: WhatsappMessageType.TEXT,
      image: WhatsappMessageType.IMAGE,
      audio: WhatsappMessageType.AUDIO,
      video: WhatsappMessageType.VIDEO,
      document: WhatsappMessageType.DOCUMENT,
      location: WhatsappMessageType.LOCATION,
      sticker: WhatsappMessageType.STICKER,
      template: WhatsappMessageType.TEMPLATE,
    };
    return map[raw] ?? WhatsappMessageType.UNSUPPORTED;
  }
}
