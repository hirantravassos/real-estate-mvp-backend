import WAWebJS from "whatsapp-web.js";
import { Customer } from "../../customers/entities/customer.entity";
import { DateHelper } from "../../../shared/utils/date.util";
import { WhatsappHelper } from "../helpers/whatsapp.helper";
import { User } from "../../users/entities/user.entity";
import { WhatsappChat } from "../entities/whatsapp-chat.entity";
import dayjs from "dayjs";

export interface WAWebCustomChatWithContactDto extends WAWebJS.Chat {
  contact: WAWebJS.Contact;
  profile: string | null;
}

export class WhatsappChatMapper {
  static toEntity(
    chat: WAWebCustomChatWithContactDto,
    user: User,
  ): WhatsappChat {
    const entity = new WhatsappChat();
    entity.phone = WhatsappHelper.getPhoneFromChat(chat) as string;
    entity.name = WhatsappHelper.getNameFromChat(chat);
    entity.unread = chat.unreadCount > 0;

    if (chat?.lastMessage?.timestamp) {
      entity.lastSentAt = dayjs(
        chat.lastMessage.timestamp * 1000,
      ).toISOString();
      entity.lastMessage = WhatsappHelper.getMessageBody(chat.lastMessage);
    } else {
      entity.lastSentAt = null;
      entity.lastMessage = null;
    }

    entity.profileUrl = chat?.profile ?? null;
    entity.user = user;
    entity.id = chat.id._serialized;
    return entity;
  }

  static toDtoList(entities: WhatsappChat[]) {
    return entities.map((chat) => {
      return {
        id: chat.id,
        name: chat.name,
        phone: chat.phone,
        profile: chat.profileUrl ?? null,
        lastMessage: {
          message: chat.lastMessage,
          sentAt: chat.lastSentAt,
        },
        customer: chat.customer ?? null,
        unread: chat.unread,
      };
    });
  }

  static toDto(
    chat: WAWebCustomChatWithContactDto,
    messages: WAWebJS.Message[],
    customer?: Customer,
  ) {
    return {
      id: chat.id?._serialized,
      name: WhatsappHelper.getNameFromChat(chat, customer),
      phone: WhatsappHelper.getPhoneFromChat(chat, customer),
      profile: chat.profile ?? null,
      customer: customer ?? null,
      messages: messages?.map((message) => this.toMessage(message)),
    };
  }

  private static toMessage(message: WAWebJS.Message) {
    return {
      id: message.id._serialized,
      fromMe: message.fromMe,
      body: WhatsappHelper.getMessageBody(message),
      type: message.type,
      hasMedia: message.hasMedia,
      location: message?.location ?? null,
      sentAt: DateHelper.formatDateTime(message.timestamp * 1000),
    };
  }
}
