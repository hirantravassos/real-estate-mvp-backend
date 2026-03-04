import { Injectable } from "@nestjs/common";
import { Chat, Contact, proto, WAMessage, WAMessageUpdate, } from "@whiskeysockets/baileys";
import dayjs from "dayjs";
import { User } from "../../users/entities/user.entity";
import { WhatsappContactService } from "./whatsapp-contact.service";
import { WhatsappChatService } from "./whatsapp-chat.service";
import { WhatsappMessageService } from "./whatsapp-message.service";
import { WhatsappMessageTypeEnum } from "../enums/whatsapp-message-type.enum";
import IMessage = proto.IMessage;
import IHistorySyncMsg = proto.IHistorySyncMsg;

const WHATSAPP_JID_SUFFIX = "@s.whatsapp.net";
const MINIMUM_PHONE_LENGTH = 10;
const COUNTRY_CODE_LENGTH = 2;

@Injectable()
export class WhatsappEventProcessorService {
  constructor(
    private readonly contactService: WhatsappContactService,
    private readonly chatService: WhatsappChatService,
    private readonly messageService: WhatsappMessageService,
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
    for (const chat of data.chats) {
      void this.chatService.upsertChat(
        user,
        chat?.id as string,
        (chat.unreadCount ?? 0) > 0,
      );

      for (const syncMessage of chat.messages ?? []) {
        this.processSyncMessage(user, selfName, syncMessage);
      }
    }

    for (const contact of data.contacts) {
      this.processContact(user, contact);
    }

    for (const rawMessage of data.messages) {
      this.processWAMessage(user, selfName, rawMessage);
    }
  }

  processMessageUpsert(
    user: User,
    selfName: string,
    messages: WAMessage[],
  ): void {
    for (const rawMessage of messages) {
      this.processWAMessage(user, selfName, rawMessage);
    }
  }

  processMessageUpdate(
    user: User,
    selfName: string,
    updates: WAMessageUpdate[],
  ): void {
    for (const update of updates) {
      this.processWAMessage(user, selfName, update);
    }
  }

  processChats(user: User, chats: Chat[]): void {
    for (const chat of chats) {
      void this.chatService.upsertChat(
        user,
        chat?.id as string,
        (chat.unreadCount ?? 0) > 0,
      );

      for (const syncMessage of chat.messages ?? []) {
        this.processSyncMessage(user, "", syncMessage);
      }
    }
  }

  processContacts(user: User, contacts: Partial<Contact>[]): void {
    for (const contact of contacts) {
      this.processContact(user, contact);
    }
  }

  private processWAMessage(
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
    const name = this.cleanName(selfName, (rawMessage as WAMessage).pushName);
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
        content: fullMessage.message?.conversation ?? "",
        type: this.resolveMessageType(fullMessage.message),
        me: !!fullMessage.key?.fromMe,
      });
    }
  }

  private processSyncMessage(
    user: User,
    selfName: string,
    syncMessage: IHistorySyncMsg,
  ): void {
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

    void this.contactService.upsertContact(user, {
      whatsappId,
      phoneNumber,
      name,
    });

    const sentAt = innerMessage.messageTimestamp
      ? dayjs.unix(innerMessage.messageTimestamp as number).toISOString()
      : new Date().toISOString();

    void this.chatService.upsertChat(user, whatsappId, false, sentAt);

    void this.messageService.upsertMessage(user, {
      messageId,
      whatsappId,
      sentAt,
      content: innerMessage.message?.conversation ?? "",
      type: this.resolveMessageType(innerMessage.message),
      me: !!innerMessage.key?.fromMe,
    });
  }

  private processContact(user: User, contact: Partial<Contact>): void {
    const whatsappId = contact.id;
    if (!whatsappId) return;

    void this.contactService.upsertContact(user, {
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
    if (message.imageMessage) return WhatsappMessageTypeEnum.IMAGE;
    if (message.videoMessage) return WhatsappMessageTypeEnum.VIDEO;
    if (message.invoiceMessage) return WhatsappMessageTypeEnum.VOICE;
    if (message.audioMessage) return WhatsappMessageTypeEnum.AUDIO;
    if (message.documentMessage) return WhatsappMessageTypeEnum.DOCUMENT;
    if (message.stickerMessage) return WhatsappMessageTypeEnum.STICKER;
    if (message.locationMessage) return WhatsappMessageTypeEnum.LOCATION;
    if (message.eventMessage) return WhatsappMessageTypeEnum.EVENT;
    if (message.protocolMessage) return WhatsappMessageTypeEnum.PROTOCOL;
    if (message.templateMessage) return WhatsappMessageTypeEnum.TEMPLATE;

    return WhatsappMessageTypeEnum.UNKNOWN;
  }
}
