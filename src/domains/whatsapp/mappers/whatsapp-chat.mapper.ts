import WAWebJS from "whatsapp-web.js";
import { DateHelper } from "../../../shared/utils/date.util";
import { WhatsappHelper } from "../helpers/whatsapp.helper";
import { User } from "../../users/entities/user.entity";
import { WhatsappChat } from "../entities/whatsapp-chat.entity";
import dayjs from "dayjs";
import { PropertyContact } from "../../properties/entities/property-contact.entity";

export interface WAWebCustomChatWithContactDto extends WAWebJS.Chat {
  contact?: WAWebJS.Contact | null;
  profile?: string | null;
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
    return entities.map((entity) => {
      return {
        id: entity.id,
        name: entity.name,
        phone: entity.phone,
        profile: entity.profileUrl ?? null,
        lastMessage: {
          message: entity.lastMessage,
          sentAt: entity.lastSentAt,
        },
        ignored: entity.ignored ?? false,
        customer: entity.customer ?? null,
        properties: this.toProperty(entity?.propertiesContact ?? []),
        isOwner: this.toProperty(entity?.propertiesContact ?? [])?.length > 0,
        unread: entity.unread,
      };
    });
  }

  static toDto(
    chat: WAWebCustomChatWithContactDto,
    entity: WhatsappChat,
    messages: WAWebJS.Message[],
  ) {
    const customer = entity.customer;
    return {
      id: chat.id?._serialized,
      name: WhatsappHelper.getNameFromChat(chat, customer),
      phone: WhatsappHelper.getPhoneFromChat(chat, customer),
      profile: chat.profile ?? null,
      customer: customer ?? null,
      properties: this.toProperty(entity?.propertiesContact ?? []),
      isOwner: this.toProperty(entity?.propertiesContact ?? [])?.length > 0,
      ignored: entity.ignored ?? false,
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

  private static toProperty(propertyContact: PropertyContact[]) {
    return propertyContact
      .map((contact) => contact.property)
      .filter((property) => !!property);
  }
}
