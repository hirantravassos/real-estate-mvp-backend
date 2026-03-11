import WAWebJS from "whatsapp-web.js";
import { Customer } from "../../customers/entities/customer.entity";
import { DateHelper } from "../../../shared/utils/date.util";

export interface WhatsappChatWithContactDto extends WAWebJS.Chat {
  contact: WAWebJS.Contact;
}

export interface WhatsappChatMessageDto extends WAWebJS.Message {
  media: WAWebJS.MessageMedia | null;
}

export class WhatsappChatMapper {
  static toDtoList(data: WhatsappChatWithContactDto[], customers?: Customer[]) {
    return data
      .filter((chat) => !chat.isGroup)
      .map((chat) => {
        const rawPhone = this.toPhone(chat);
        const customerFound = customers?.find(
          (customer) => customer.phone === rawPhone,
        );
        const phone = this.toPhone(chat, customerFound);
        const name = this.toName(chat, customerFound);
        return {
          id: chat.id._serialized,
          name,
          phone,
          lastMessage: {
            message:
              chat.lastMessage.type === "chat"
                ? this.toMessageBody(chat.lastMessage)
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
      name: this.toName(data, customer),
      phone: this.toPhone(data, customer),
      customer: customer ?? null,
      messages: messages?.map((message) => this.toMessage(message)),
    };
  }

  private static toMessage(message: WhatsappChatMessageDto) {
    return {
      id: message.id._serialized,
      fromMe: message.fromMe,
      body: this.toMessageBody(message),
      type: message.type,
      media: message.hasMedia ? message.media : null,
      location: message?.location ?? null,
      sentAt: DateHelper.formatDateTime(message.timestamp * 1000),
    };
  }

  private static toName(
    chat: WhatsappChatWithContactDto,
    customer?: Customer,
  ): string {
    if (customer?.name) return customer.name;

    const isNameAPhone = /\d/.test(chat.name || "");

    if (chat.name && !isNameAPhone) return chat.name;

    if (chat?.contact?.verifiedName) return chat?.contact?.verifiedName;

    return chat.name ?? "Unknown";
  }

  private static toPhone(
    chat: WhatsappChatWithContactDto,
    customer?: Customer,
  ): string | null {
    if (chat?.contact?.number) return chat?.contact?.number?.slice(2);
    if (customer?.phone) return customer.phone;

    let rawUser = "";

    if (chat.id.server === "c.us") {
      rawUser = chat.id.user;
    } else if (chat.id.server === "lid") {
      rawUser = chat.name ? chat.name.replace(/\D/g, "") : "";
    }

    return rawUser.startsWith("55") ? rawUser.slice(2) : rawUser;
  }

  private static toMessageBody(message: WAWebJS.Message): string | null {
    if (message.body === "") return null;
    return message.body;
  }
}
