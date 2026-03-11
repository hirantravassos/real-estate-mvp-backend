import WAWebJS from "whatsapp-web.js";
import { Customer } from "../../customers/entities/customer.entity";
import { DateHelper } from "../../../shared/utils/date.util";

export class WhatsappChatMapper {
  static toDto(data: WAWebJS.Chat[], customers?: Customer[]) {
    return data
      .filter((chat) => !chat.isGroup)
      .map((chat) => {
        const rawPhone = this.getPhone(chat);
        const customerFound = customers?.find(
          (customer) => customer.phone === rawPhone,
        );
        const phone = this.getPhone(chat, customerFound);
        const name = this.getName(chat, customerFound);
        return {
          id: chat.id._serialized,
          name,
          phone,
          lastMessage: {
            message: chat.lastMessage.body,
            fromMe: chat.lastMessage.fromMe,
            sentAt: DateHelper.formatDateTime(
              chat.lastMessage.timestamp * 1000,
            ),
          },
          unread: chat.unreadCount > 0,
        };
      });
  }

  private static getName(chat: WAWebJS.Chat, customer?: Customer): string {
    if (customer?.name) return customer.name;

    const isNameAPhone = /\d/.test(chat.name || "");

    if (chat.name && !isNameAPhone) return chat.name;

    return chat.name ?? "Unknown";
  }

  private static getPhone(
    chat: WAWebJS.Chat,
    customer?: Customer,
  ): string | null {
    if (customer?.phone) return customer.phone;

    let rawUser = "";

    if (chat.id.server === "c.us") {
      rawUser = chat.id.user;
    } else if (chat.id.server === "lid") {
      rawUser = chat.name ? chat.name.replace(/\D/g, "") : "";
    }

    return rawUser.startsWith("55") ? rawUser.slice(2) : rawUser;
  }
}
