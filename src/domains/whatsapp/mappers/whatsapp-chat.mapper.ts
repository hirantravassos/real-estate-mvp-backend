import WAWebJS, { MessageTypes } from "whatsapp-web.js";
import { Customer } from "../../customers/entities/customer.entity";
import { DateHelper } from "../../../shared/utils/date.util";
import { WhatsappHelper } from "../helpers/whatsapp.helper";

export interface WhatsappChatWithContactDto extends WAWebJS.Chat {
  contact: WAWebJS.Contact;
  profile: string | null;
}

export interface WhatsappChatMessageDto extends WAWebJS.Message {
  media: WAWebJS.MessageMedia | null;
}

export class WhatsappChatMapper {
  static toDtoList(data: WhatsappChatWithContactDto[], customers?: Customer[]) {
    return data
      .filter((chat) => !chat.isGroup)
      .map((chat) => {
        const rawPhone = WhatsappHelper.getPhoneFromChat(chat);
        const customerFound = customers?.find(
          (customer) => customer.phone === rawPhone,
        );
        const phone = WhatsappHelper.getPhoneFromChat(chat, customerFound);
        const name = WhatsappHelper.getNameFromChat(chat, customerFound);
        return {
          id: chat.id._serialized,
          name,
          phone,
          profile: chat.profile ?? null,
          lastMessage: {
            message:
              chat.lastMessage.type === MessageTypes.TEXT
                ? WhatsappHelper.getMessageBody(chat.lastMessage)
                : null,
            fromMe: chat.lastMessage.fromMe,
            sentAt: DateHelper.formatDateTime(
              chat.lastMessage.timestamp * 1000,
            ),
          },
          customer: customerFound,
          unread: chat.unreadCount > 0,
        };
      });
  }

  static toDto(
    data: WhatsappChatWithContactDto,
    messages: WhatsappChatMessageDto[],
    customer?: Customer,
  ) {
    return {
      id: data.id._serialized,
      name: WhatsappHelper.getNameFromChat(data, customer),
      phone: WhatsappHelper.getPhoneFromChat(data, customer),
      profile: data.profile ?? null,
      customer: customer ?? null,
      messages: messages?.map((message) => this.toMessage(message)),
    };
  }

  private static toMessage(message: WhatsappChatMessageDto) {
    return {
      id: message.id._serialized,
      fromMe: message.fromMe,
      body: WhatsappHelper.getMessageBody(message),
      type: message.type,
      media: message.hasMedia ? message.media : null,
      location: message?.location ?? null,
      sentAt: DateHelper.formatDateTime(message.timestamp * 1000),
    };
  }
}
