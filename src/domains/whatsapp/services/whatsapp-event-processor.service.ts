import { Injectable } from "@nestjs/common";
import { Chat, Contact, proto, WAMessage, WAMessageUpdate, } from "@whiskeysockets/baileys";
import dayjs from "dayjs";
import { User } from "../../users/entities/user.entity";
import { WhatsappContactService } from "./whatsapp-contact.service";
import { WhatsappChatService } from "./whatsapp-chat.service";
import { WhatsappMessageService } from "./whatsapp-message.service";
import { WhatsappMediaService } from "./whatsapp-media.service";
import { WhatsappMessageTypeEnum } from "../enums/whatsapp-message-type.enum";
import { Long } from "typeorm";
import IMessage = proto.IMessage;
import IHistorySyncMsg = proto.IHistorySyncMsg;

const WHATSAPP_JID_SUFFIX = "@s.whatsapp.net";
const MINIMUM_PHONE_LENGTH = 10;
const COUNTRY_CODE_LENGTH = 2;
const SYNC_BATCH_SIZE = 10;
const SYNC_BATCH_DELAY_MS = 100;
const SYNC_MAX_AGE_MONTHS = 6;

@Injectable()
export class WhatsappEventProcessorService {
  constructor(
    private readonly contactService: WhatsappContactService,
    private readonly chatService: WhatsappChatService,
    private readonly messageService: WhatsappMessageService,
    private readonly mediaService: WhatsappMediaService,
  ) {}

  processHistorySync(
    user: User,
    selfName: string,
    data: {
      chats: Chat[];
      contacts: Contact[];
      messages: WAMessage[];
    },
  ): void {
    const tasks: Array<() => Promise<void>> = [];
    const cutoffDate = dayjs().subtract(SYNC_MAX_AGE_MONTHS, "month");

    for (const chat of data.chats) {
      tasks.push(() =>
        this.chatService.upsertChat(
          user,
          chat?.id as string,
          (chat.unreadCount ?? 0) > 0,
        ),
      );

      for (const syncMessage of chat.messages ?? []) {
        if (
          this.isWithinThreshold(
            syncMessage.message?.messageTimestamp as number | Long | null,
            cutoffDate,
          )
        ) {
          tasks.push(() =>
            this.processSyncMessageAsync(user, selfName, syncMessage),
          );
        }
      }
    }

    for (const contact of data.contacts) {
      tasks.push(() => this.processContactAsync(user, contact));
    }

    for (const rawMessage of data.messages) {
      if (
        this.isWithinThreshold(
          rawMessage.messageTimestamp as number | Long | null,
          cutoffDate,
        )
      ) {
        tasks.push(() =>
          this.processMessageAsync(user, selfName, rawMessage, false),
        );
      }
    }

    void this.processInChunks(tasks);
  }

  processMessageUpsert(
    user: User,
    selfName: string,
    messages: WAMessage[],
  ): void {
    for (const rawMessage of messages) {
      this.processRealtimeMessage(user, selfName, rawMessage);
    }
  }

  processMessageUpdate(
    user: User,
    selfName: string,
    updates: WAMessageUpdate[],
  ): void {
    for (const update of updates) {
      this.processRealtimeMessage(user, selfName, update);
    }
  }

  processChats(user: User, chats: Chat[]): void {
    const tasks: Array<() => Promise<void>> = [];
    const cutoffDate = dayjs().subtract(SYNC_MAX_AGE_MONTHS, "month");

    for (const chat of chats) {
      tasks.push(() =>
        this.chatService.upsertChat(
          user,
          chat?.id as string,
          (chat.unreadCount ?? 0) > 0,
        ),
      );

      for (const syncMessage of chat.messages ?? []) {
        if (
          this.isWithinThreshold(
            syncMessage.message?.messageTimestamp as number | Long | null,
            cutoffDate,
          )
        ) {
          tasks.push(() => this.processSyncMessageAsync(user, "", syncMessage));
        }
      }
    }

    void this.processInChunks(tasks);
  }

  processContacts(user: User, contacts: Partial<Contact>[]): void {
    const tasks: Array<() => Promise<void>> = [];

    for (const contact of contacts) {
      tasks.push(() => this.processContactAsync(user, contact));
    }

    void this.processInChunks(tasks);
  }

  private async processInChunks(
    tasks: Array<() => Promise<void>>,
  ): Promise<void> {
    for (let offset = 0; offset < tasks.length; offset += SYNC_BATCH_SIZE) {
      const chunk = tasks.slice(offset, offset + SYNC_BATCH_SIZE);

      for (const task of chunk) {
        await task();
      }

      if (offset + SYNC_BATCH_SIZE < tasks.length) {
        await this.delay(SYNC_BATCH_DELAY_MS);
      }
    }
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  private isWithinThreshold(
    timestamp: number | Long | null | undefined,
    cutoffDate: dayjs.Dayjs,
  ): boolean {
    if (!timestamp) return true;
    return dayjs.unix(Number(timestamp)).isAfter(cutoffDate);
  }

  /**
   * Real-time messages: fire-and-forget, includes media download.
   */
  private processRealtimeMessage(
    user: User,
    selfName: string,
    rawMessage: WAMessage | WAMessageUpdate,
  ): void {
    const whatsappId = rawMessage.key?.remoteJid;
    const messageId = rawMessage.key?.id;

    if (!whatsappId || !messageId) return;

    const phoneNumber =
      this.extractPhoneNumber(whatsappId) ??
      this.extractPhoneNumber(rawMessage.key?.remoteJidAlt);
    const isFromMe = !!rawMessage.key?.fromMe;
    const name = isFromMe
      ? null
      : this.cleanName(selfName, (rawMessage as WAMessage).pushName);
    const fullMessage = rawMessage as WAMessage;

    void this.contactService.upsertContact(user, {
      whatsappId,
      phoneNumber,
      name,
    });

    const sentAt = fullMessage.messageTimestamp
      ? dayjs.unix(fullMessage.messageTimestamp as number).toISOString()
      : new Date().toISOString();

    void this.chatService.upsertChat(user, whatsappId, true, sentAt);

    if (fullMessage.message || fullMessage.messageTimestamp) {
      void this.messageService.upsertMessage(user, {
        messageId,
        whatsappId,
        sentAt,
        content: this.extractContent(fullMessage.message),
        type: this.resolveMessageType(fullMessage.message),
        me: !!fullMessage.key?.fromMe,
      });

      if (fullMessage.message) {
        void this.mediaService.downloadAndStore(user, fullMessage);
      }
    }
  }

  /**
   * Sync messages: sequential (awaited), no media download.
   */
  private async processMessageAsync(
    user: User,
    selfName: string,
    rawMessage: WAMessage | WAMessageUpdate,
    shouldDownloadMedia: boolean,
  ): Promise<void> {
    const whatsappId = rawMessage.key?.remoteJid;
    const messageId = rawMessage.key?.id;

    if (!whatsappId || !messageId) return;

    const phoneNumber =
      this.extractPhoneNumber(whatsappId) ??
      this.extractPhoneNumber(rawMessage.key?.remoteJidAlt);
    const isFromMe = !!rawMessage.key?.fromMe;
    const name = isFromMe
      ? null
      : this.cleanName(selfName, (rawMessage as WAMessage).pushName);
    const fullMessage = rawMessage as WAMessage;

    await this.contactService.upsertContact(user, {
      whatsappId,
      phoneNumber,
      name,
    });

    const sentAt = fullMessage.messageTimestamp
      ? dayjs.unix(fullMessage.messageTimestamp as number).toISOString()
      : new Date().toISOString();

    await this.chatService.upsertChat(user, whatsappId, true, sentAt);

    if (fullMessage.message || fullMessage.messageTimestamp) {
      await this.messageService.upsertMessage(user, {
        messageId,
        whatsappId,
        sentAt,
        content: this.extractContent(fullMessage.message),
        type: this.resolveMessageType(fullMessage.message),
        me: !!fullMessage.key?.fromMe,
      });

      if (shouldDownloadMedia && fullMessage.message) {
        await this.mediaService.downloadAndStore(user, fullMessage);
      }
    }
  }

  private async processSyncMessageAsync(
    user: User,
    selfName: string,
    syncMessage: IHistorySyncMsg,
  ): Promise<void> {
    const innerMessage = syncMessage.message;
    if (!innerMessage) return;

    const whatsappId = innerMessage.key?.remoteJid;
    const messageId = innerMessage.key?.id;

    if (!whatsappId || !messageId) return;

    const phoneNumber =
      this.extractPhoneNumber(whatsappId) ??
      this.extractPhoneNumber(innerMessage.key?.remoteJid ?? undefined) ??
      // @ts-expect-error: missing type
      this.extractPhoneNumber(innerMessage.key?.remoteJidAlt);
    const name = this.cleanName(selfName, innerMessage.pushName);

    await this.contactService.upsertContact(user, {
      whatsappId,
      phoneNumber,
      name,
    });

    const sentAt = innerMessage.messageTimestamp
      ? dayjs.unix(innerMessage.messageTimestamp as number).toISOString()
      : new Date().toISOString();

    await this.chatService.upsertChat(user, whatsappId, false, sentAt);

    await this.messageService.upsertMessage(user, {
      messageId,
      whatsappId,
      sentAt,
      content: this.extractContent(innerMessage.message),
      type: this.resolveMessageType(innerMessage.message),
      me: !!innerMessage.key?.fromMe,
    });
  }

  private async processContactAsync(
    user: User,
    contact: Partial<Contact>,
  ): Promise<void> {
    const whatsappId = contact.id;
    if (!whatsappId) return;

    await this.contactService.upsertContact(user, {
      whatsappId,
      phoneNumber: this.extractPhoneNumber(whatsappId),
      name: contact.notify ?? contact.name ?? null,
    });
  }

  private extractPhoneNumber(jid?: string): string | null {
    if (!jid?.includes(WHATSAPP_JID_SUFFIX)) return null;

    const rawNumber = jid
      .replace(WHATSAPP_JID_SUFFIX, "")
      .slice(COUNTRY_CODE_LENGTH);
    if (rawNumber.length < MINIMUM_PHONE_LENGTH) return null;

    return rawNumber;
  }

  private cleanName(
    selfName: string,
    possibleName?: string | null,
  ): string | null {
    if (!possibleName) return null;
    const cleaned = possibleName.replaceAll(selfName, "").trim();
    return cleaned.length > 0 ? cleaned : null;
  }

  private resolveMessageType(
    message: IMessage | null | undefined,
  ): WhatsappMessageTypeEnum {
    if (!message) return WhatsappMessageTypeEnum.UNKNOWN;

    if (message.conversation) return WhatsappMessageTypeEnum.TEXT;
    if (message.extendedTextMessage) return WhatsappMessageTypeEnum.TEXT;
    if (message.imageMessage) return WhatsappMessageTypeEnum.IMAGE;
    if (message.videoMessage) return WhatsappMessageTypeEnum.VIDEO;
    if (message.audioMessage?.ptt) return WhatsappMessageTypeEnum.VOICE;
    if (message.audioMessage) return WhatsappMessageTypeEnum.AUDIO;
    if (message.documentMessage) return WhatsappMessageTypeEnum.DOCUMENT;
    if (message.stickerMessage) return WhatsappMessageTypeEnum.STICKER;
    if (message.locationMessage) return WhatsappMessageTypeEnum.LOCATION;
    if (message.eventMessage) return WhatsappMessageTypeEnum.EVENT;
    if (message.protocolMessage) return WhatsappMessageTypeEnum.PROTOCOL;
    if (message.templateMessage) return WhatsappMessageTypeEnum.TEMPLATE;

    return WhatsappMessageTypeEnum.UNKNOWN;
  }

  private extractContent(message: IMessage | null | undefined): string {
    if (!message) return "";

    if (message.conversation) return message.conversation;
    if (message.extendedTextMessage?.text)
      return message.extendedTextMessage.text;
    if (message.imageMessage?.caption) return message.imageMessage.caption;
    if (message.videoMessage?.caption) return message.videoMessage.caption;
    if (message.documentMessage?.fileName)
      return message.documentMessage.fileName;

    return "";
  }
}
