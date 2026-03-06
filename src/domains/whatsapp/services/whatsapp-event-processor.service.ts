import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { Chat, Contact, proto, WAMessage, WAMessageUpdate, } from "@whiskeysockets/baileys";
import dayjs from "dayjs";
import { User } from "../../users/entities/user.entity";
import { WhatsappContactService } from "./whatsapp-contact.service";
import { WhatsappChatService } from "./whatsapp-chat.service";
import { WhatsappMessageService } from "./whatsapp-message.service";
import { WhatsappMediaService } from "./whatsapp-media.service";
import { WhatsappMessageTypeEnum } from "../enums/whatsapp-message-type.enum";
import { WhatsappGateway } from "../gateways/whatsapp.gateway";
import IMessage = proto.IMessage;
import IHistorySyncMsg = proto.IHistorySyncMsg;

const WHATSAPP_JID_SUFFIX = "@s.whatsapp.net";
const MINIMUM_PHONE_LENGTH = 10;
const COUNTRY_CODE_LENGTH = 2;
const SYNC_BATCH_SIZE = 10;
const SYNC_BATCH_DELAY_MS = 100;

@Injectable()
export class WhatsappEventProcessorService {
  constructor(
    private readonly contactService: WhatsappContactService,
    @Inject(forwardRef(() => WhatsappChatService))
    private readonly chatService: WhatsappChatService,
    private readonly messageService: WhatsappMessageService,
    private readonly mediaService: WhatsappMediaService,
    @Inject(forwardRef(() => WhatsappGateway))
    private readonly gateway: WhatsappGateway,
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

    for (const chat of data.chats) {
      tasks.push(() =>
        this.chatService.save({
          user,
          whatsappId: chat?.id as string,
          unread: this.getChatUnreadCount(chat.unreadCount),
        }),
      );

      for (const syncMessage of chat.messages ?? []) {
        void this.processSyncMessageAsync(user, selfName, syncMessage);
      }
    }

    for (const contact of data.contacts) {
      tasks.push(() => this.processContactAsync(user, contact));
    }

    for (const rawMessage of data.messages) {
      void this.processMessageAsync(user, selfName, rawMessage, false);
    }

    void this.processInChunks(tasks);
  }

  processMessageUpsert(
    user: User,
    selfName: string,
    insertedMessages: WAMessage[],
  ): void {
    for (const message of insertedMessages) {
      this.processRealtimeMessage(user, selfName, message);
    }
  }

  processMessageUpdate(user: User, updatedMessages: WAMessageUpdate[]): void {
    for (const message of updatedMessages) {
      const whatsappId = message?.key?.remoteJid;
      const unread = message.update.status !== proto.WebMessageInfo.Status.READ;
      if (!whatsappId) return;
      void this.chatService.save({
        user,
        whatsappId,
        unread,
      });
    }
  }

  processChats(user: User, chats: Chat[]): void {
    for (const chat of chats) {
      const unread = (chat?.unreadCount ?? 0) > 0;
      const whatsappId = chat?.id as string;
      console.log("chat updates from chat");
      // void this.chatService.upsertChat(user, whatsappId, unread);
    }
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

  private processRealtimeMessage(
    user: User,
    selfName: string,
    raw: WAMessage | WAMessageUpdate,
  ): void {
    const message = raw as WAMessage;
    const whatsappId = message.key?.remoteJid;
    const messageId = message.key?.id;
    const isFromMe = !!message.key?.fromMe;
    const name = isFromMe ? null : this.cleanName(selfName, message.pushName);
    const sentAt = message.messageTimestamp
      ? dayjs.unix(message.messageTimestamp as number).toISOString()
      : new Date().toISOString();
    const phoneNumber =
      this.extractPhoneNumber(whatsappId) ??
      this.extractPhoneNumber(message.key?.remoteJidAlt);

    if (!whatsappId || !messageId) {
      console.warn("WARN [processRealtimeMessage]: Unavailable id", {
        whatsappId,
        messageId,
      });
      return;
    }

    void this.contactService.upsertContact(user, {
      whatsappId,
      phoneNumber,
      name,
    });

    void this.chatService.save({
      user,
      whatsappId,
      unread: true,
      lastSentAt: sentAt,
    });

    console.log(
      "processRealtimeMessage is message?",
      "message.message || message.messageTimestamp",
      {
        message,
        messageMessage: message?.message,
        messageTimestamp: message?.messageTimestamp,
      },
    );

    if (message.message || message.messageTimestamp) {
      const unwrapped = this.unwrapMessage(message.message);

      void this.messageService.save(user, {
        messageId,
        whatsappId,
        sentAt,
        content: this.extractContent(unwrapped),
        type: this.resolveMessageType(unwrapped),
        me: !!message.key?.fromMe,
      });

      if (message.message) {
        void this.mediaService.downloadAndStore(user, message).then(() => {
          void this.gateway.emitChatUpdate(user, whatsappId);
        });
      }
    }
  }

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

    console.log("processMessageAsync", {
      whatsappId,
      messageId,
      sentAt,
    });
    await this.chatService.save({
      user,
      whatsappId,
      unread: true,
      lastSentAt: sentAt,
    });

    if (fullMessage.message || fullMessage.messageTimestamp) {
      const unwrapped = this.unwrapMessage(fullMessage.message);

      await this.messageService.save(user, {
        messageId,
        whatsappId,
        sentAt,
        content: this.extractContent(unwrapped),
        type: this.resolveMessageType(unwrapped),
        me: !!fullMessage.key?.fromMe,
      });

      if (shouldDownloadMedia && fullMessage.message) {
        await this.mediaService.downloadAndStore(user, fullMessage);
      }
    }

    void this.gateway.emitChatsUpdate(user);
    void this.gateway.emitChatUpdate(user, whatsappId);
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
    const isFromMe = !!innerMessage.key?.fromMe;
    const name = isFromMe
      ? null
      : this.cleanName(selfName, innerMessage.pushName);

    await this.contactService.upsertContact(user, {
      whatsappId,
      phoneNumber,
      name,
    });

    const sentAt = innerMessage.messageTimestamp
      ? dayjs.unix(innerMessage.messageTimestamp as number).toISOString()
      : new Date().toISOString();

    await this.chatService.save({
      user,
      whatsappId,
      unread: true,
      lastSentAt: sentAt,
    });

    const unwrapped = this.unwrapMessage(innerMessage.message);

    await this.messageService.save(user, {
      messageId,
      whatsappId,
      sentAt,
      content: this.extractContent(unwrapped),
      type: this.resolveMessageType(unwrapped),
      me: !!innerMessage.key?.fromMe,
    });

    void this.gateway.emitChatsUpdate(user);
    void this.gateway.emitChatUpdate(user, whatsappId);
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

  private extractPhoneNumber(jid?: string | null): string | null {
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

  private unwrapMessage(message: IMessage | null | undefined): IMessage | null {
    if (!message) return null;

    const wrapperCandidates = [
      message.viewOnceMessage,
      message.viewOnceMessageV2,
      message.viewOnceMessageV2Extension,
      message.ephemeralMessage,
      message.documentWithCaptionMessage,
      message.editedMessage,
    ];

    for (const wrapper of wrapperCandidates) {
      if (wrapper?.message) {
        return this.unwrapMessage(wrapper.message);
      }
    }

    return message;
  }

  private resolveMessageType(
    message: IMessage | null | undefined,
  ): WhatsappMessageTypeEnum {
    if (!message) return WhatsappMessageTypeEnum.UNKNOWN;

    if (message.conversation) return WhatsappMessageTypeEnum.TEXT;
    if (message.extendedTextMessage) return WhatsappMessageTypeEnum.TEXT;
    if (message.imageMessage) return WhatsappMessageTypeEnum.IMAGE;
    if (message.videoMessage) return WhatsappMessageTypeEnum.VIDEO;
    if (message.ptvMessage) return WhatsappMessageTypeEnum.PTV;
    if (message.audioMessage?.ptt) return WhatsappMessageTypeEnum.VOICE;
    if (message.audioMessage) return WhatsappMessageTypeEnum.AUDIO;
    if (message.documentMessage) return WhatsappMessageTypeEnum.DOCUMENT;
    if (message.stickerMessage) return WhatsappMessageTypeEnum.STICKER;
    if (message.lottieStickerMessage)
      return WhatsappMessageTypeEnum.LOTTIE_STICKER;
    if (message.locationMessage) return WhatsappMessageTypeEnum.LOCATION;
    if (message.liveLocationMessage)
      return WhatsappMessageTypeEnum.LIVE_LOCATION;
    if (message.contactMessage) return WhatsappMessageTypeEnum.CONTACT;
    if (message.contactsArrayMessage)
      return WhatsappMessageTypeEnum.CONTACT_ARRAY;
    if (message.groupInviteMessage) return WhatsappMessageTypeEnum.GROUP_INVITE;
    if (message.listMessage) return WhatsappMessageTypeEnum.LIST;
    if (message.listResponseMessage)
      return WhatsappMessageTypeEnum.LIST_RESPONSE;
    if (message.buttonsMessage) return WhatsappMessageTypeEnum.BUTTONS;
    if (message.buttonsResponseMessage)
      return WhatsappMessageTypeEnum.BUTTONS_RESPONSE;
    if (message.templateMessage) return WhatsappMessageTypeEnum.TEMPLATE;
    if (message.reactionMessage) return WhatsappMessageTypeEnum.REACTION;
    if (message.pollCreationMessage) return WhatsappMessageTypeEnum.POLL;
    if (message.pollCreationMessageV2) return WhatsappMessageTypeEnum.POLL;
    if (message.pollCreationMessageV3) return WhatsappMessageTypeEnum.POLL;
    if (message.pollUpdateMessage) return WhatsappMessageTypeEnum.POLL_UPDATE;
    if (message.orderMessage) return WhatsappMessageTypeEnum.ORDER;
    if (message.interactiveMessage) return WhatsappMessageTypeEnum.INTERACTIVE;
    if (message.interactiveResponseMessage)
      return WhatsappMessageTypeEnum.INTERACTIVE;
    if (message.callLogMesssage) return WhatsappMessageTypeEnum.CALL;
    if (message.bcallMessage) return WhatsappMessageTypeEnum.CALL;
    if (message.albumMessage) return WhatsappMessageTypeEnum.ALBUM;
    if (message.eventMessage) return WhatsappMessageTypeEnum.EVENT;
    if (message.protocolMessage) {
      if (message.protocolMessage.type === 14) {
        return this.resolveMessageType(message.protocolMessage.editedMessage);
      }
      return WhatsappMessageTypeEnum.PROTOCOL;
    }

    return WhatsappMessageTypeEnum.UNKNOWN;
  }

  private extractContent(message: IMessage | null | undefined): string {
    if (!message) return "";

    if (message.conversation) return message.conversation;
    if (message.extendedTextMessage?.text)
      return message.extendedTextMessage.text;
    if (message.imageMessage?.caption) return message.imageMessage.caption;
    if (message.videoMessage?.caption) return message.videoMessage.caption;
    if (message.ptvMessage?.caption) return message.ptvMessage.caption;
    if (message.documentMessage?.fileName)
      return message.documentMessage.fileName;

    if (message.contactMessage?.displayName)
      return message.contactMessage.displayName;

    if (message.contactsArrayMessage?.contacts) {
      return message.contactsArrayMessage.contacts
        .map((contact) => contact.displayName)
        .filter(Boolean)
        .join(", ");
    }

    if (message.locationMessage) {
      const latitude = message.locationMessage.degreesLatitude;
      const longitude = message.locationMessage.degreesLongitude;
      if (latitude && longitude) {
        return `https://maps.google.com/?q=${latitude},${longitude}`;
      }
      return message.locationMessage.name ?? "";
    }

    if (message.liveLocationMessage) {
      const latitude = message.liveLocationMessage.degreesLatitude;
      const longitude = message.liveLocationMessage.degreesLongitude;
      if (latitude && longitude) {
        return `https://maps.google.com/?q=${latitude},${longitude}`;
      }
      return message.liveLocationMessage.caption ?? "";
    }

    if (message.groupInviteMessage?.groupName)
      return message.groupInviteMessage.groupName;

    if (message.listMessage) {
      return message.listMessage.title ?? message.listMessage.description ?? "";
    }

    if (message.listResponseMessage?.title)
      return message.listResponseMessage.title;

    if (message.buttonsMessage?.contentText)
      return message.buttonsMessage.contentText;

    if (message.buttonsResponseMessage?.selectedDisplayText)
      return message.buttonsResponseMessage.selectedDisplayText;

    if (message.reactionMessage?.text) return message.reactionMessage.text;

    if (message.pollCreationMessage?.name)
      return message.pollCreationMessage.name;
    if (message.pollCreationMessageV2?.name)
      return message.pollCreationMessageV2.name;
    if (message.pollCreationMessageV3?.name)
      return message.pollCreationMessageV3.name;

    if (message.orderMessage?.message) return message.orderMessage.message;

    if (message.interactiveMessage?.body?.text)
      return message.interactiveMessage.body.text;

    if (message.templateMessage?.hydratedFourRowTemplate) {
      const template = message.templateMessage.hydratedFourRowTemplate;
      return template.hydratedContentText ?? template.hydratedTitleText ?? "";
    }

    if (message.audioMessage) return "";
    if (message.stickerMessage) return "";
    if (message.lottieStickerMessage) return "";

    if (message.protocolMessage) {
      if (message.protocolMessage.type === 14) {
        // 14 is the protobuf enum for MESSAGE_EDIT
        const text = this.extractContent(message.protocolMessage.editedMessage);
        return text ? `[Editado] ${text}` : "";
      }
      return "";
    }

    console.warn(
      `Unhandled message content parsing payload:\n${JSON.stringify(message, null, 2)}`,
    );

    return "";
  }

  private getChatUnreadCount(count: number | null | undefined): boolean {
    return (count ?? 1) > 0;
  }
}
