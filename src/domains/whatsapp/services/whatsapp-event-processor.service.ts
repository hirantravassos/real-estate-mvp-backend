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

const WHATSAPP_PNID_SUFFIX = "@s.whatsapp.net";
const WHATSAPP_LID_SUFFIX = "@lid";
const MINIMUM_PHONE_LENGTH = 10;
const COUNTRY_CODE_LENGTH = 2;

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

  async processHistorySync(
    user: User,
    data: {
      chats: Chat[];
      contacts: Contact[];
      messages: WAMessage[];
      isLatest?: boolean;
      progress?: number | null;
      syncType?: proto.HistorySync.HistorySyncType | null;
      peerDataRequestSessionId?: string | null;
    },
  ): Promise<void> {
    if (data.syncType === proto.HistorySync.HistorySyncType.INITIAL_BOOTSTRAP) {
      await this.processContactsSync(user, data.contacts);
      await this.processChatsSync(user, data.chats);
      return;
    }

    if (data.syncType === proto.HistorySync.HistorySyncType.PUSH_NAME) {
      void this.processContactsSyncNamesOnly(user, data.contacts);
      return;
    }

    if (data.syncType === proto.HistorySync.HistorySyncType.RECENT) {
      void this.processMessages(user, data.messages);
      return;
    }

    if (data.syncType === proto.HistorySync.HistorySyncType.FULL) {
      void this.processMessages(user, data.messages);
      return;
    }

    if (data.syncType === proto.HistorySync.HistorySyncType.INITIAL_STATUS_V3) {
      // No data, only sync meta for connections
      return;
    }

    if (data.syncType === proto.HistorySync.HistorySyncType.NON_BLOCKING_DATA) {
      // No data, only sync meta for connections
      return;
    }

    console.warn(`NEW SYNC TYPE!!!!! ${data.syncType}`, JSON.stringify(data));
  }

  async processMessages(user: User, newMessages: WAMessage[]): Promise<void> {
    for (const message of newMessages) {
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve({});
        }, 200);
      });

      const whatsappId = message.key?.remoteJid;
      const messageId = message.key?.id;
      const isFromMe = !!message.key?.fromMe;
      const sentAt = message.messageTimestamp
        ? dayjs.unix(message.messageTimestamp as number).toISOString()
        : new Date().toISOString();
      const protocolMessageType = message?.message?.protocolMessage?.type;

      if (protocolMessageType) continue;
      if (!whatsappId) continue;
      if (!messageId) continue;

      if (message.message || message.messageTimestamp) {
        const unwrapped = this.unwrapMessage(message.message);

        void this.messageService.save(user, {
          messageId,
          whatsappId,
          sentAt,
          content: this.extractContent(unwrapped),
          type: this.resolveMessageType(unwrapped),
          me: isFromMe,
        });

        if (message.message) {
          void this.mediaService.downloadAndStore(user, message).then(() => {
            void this.gateway.emitChatUpdate(user, whatsappId);
          });
        }
      }
    }
  }

  async processChatsSync(user: User, newChats: Chat[]): Promise<void> {
    for (const chat of newChats) {
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve({});
        }, 200);
      });
      const whatsappId = chat?.id;
      const isLid = chat?.id?.includes(WHATSAPP_LID_SUFFIX);
      const lastSentAt = chat.lastMessageRecvTimestamp
        ? new Date(chat.lastMessageRecvTimestamp).toISOString()
        : undefined;

      if (!whatsappId || !isLid) continue;

      await this.chatService.save(user, whatsappId, {
        unread: (chat.unreadCount ?? 0) > 0,
        lastSentAt,
      });
    }
  }

  async processContactsSync(user: User, newContacts: Contact[]): Promise<void> {
    for (const contact of newContacts) {
      const phoneNumber = this.extractPhoneNumber(contact?.phoneNumber);
      const whatsappId = contact?.id;
      const isLid = whatsappId?.includes("@lid");

      if (isLid && whatsappId && phoneNumber) {
        await this.contactService.save(user, whatsappId, {
          phoneNumber,
          name: contact?.notify ?? null,
        });
      }
    }
  }

  async processContactsSyncNamesOnly(
    user: User,
    newContacts: Contact[],
  ): Promise<void> {
    for (const contact of newContacts) {
      const phone = this.extractPhoneNumber(contact?.id);
      const name = contact?.notify ?? null;

      if (phone) {
        await this.contactService.updateNameByPhoneNumber(user, phone, name);
      }
    }
  }

  async processContactsUpdate(
    user: User,
    newContacts: Contact[],
  ): Promise<void> {
    for (const contact of newContacts) {
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve({});
        }, 200);
      });
      const whatsappId = contact?.id;
      const name = contact?.notify ?? null;
      const phoneNumber = this.extractPhoneNumber(whatsappId);
      const isWhatsappIdLidId = !whatsappId?.includes(WHATSAPP_PNID_SUFFIX);

      if (whatsappId && isWhatsappIdLidId) {
        void this.contactService.save(user, whatsappId, {
          name,
          phoneNumber,
        });
        continue;
      }

      if (phoneNumber && !isWhatsappIdLidId) {
        void this.contactService.updateNameByPhoneNumber(
          user,
          phoneNumber,
          name,
        );
      }
    }
  }

  processMessageUpdate(user: User, updatedMessages: WAMessageUpdate[]): void {
    for (const message of updatedMessages) {
      const whatsappId = message?.key?.remoteJid;
      const unread = message.update.status !== proto.WebMessageInfo.Status.READ;
      if (!whatsappId) return;
      void this.chatService.save(user, whatsappId, {
        unread,
      });
    }
  }

  private extractPhoneNumber(jid?: string | null): string | null {
    if (!jid?.includes(WHATSAPP_PNID_SUFFIX)) return null;

    const rawNumber = jid
      .replace(WHATSAPP_PNID_SUFFIX, "")
      .slice(COUNTRY_CODE_LENGTH);
    if (rawNumber.length < MINIMUM_PHONE_LENGTH) return null;

    return rawNumber;
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
}
