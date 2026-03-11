import { Customer } from "../../customers/entities/customer.entity";
import WAWebJS from "whatsapp-web.js";
import { WhatsappChatWithContactDto } from "../mappers/whatsapp-chat.mapper";

export class WhatsappHelper {
  static getNameFromChat(
    chat: WhatsappChatWithContactDto,
    customer?: Customer,
  ): string {
    if (customer?.name) return customer.name;

    const isNameAPhone = /\d/.test(chat.name || "");

    if (chat.name && !isNameAPhone) return chat.name;

    if (chat?.contact?.verifiedName) return chat?.contact?.verifiedName;

    return chat.name ?? "Unknown";
  }

  static getPhoneFromChat(
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

  static getMessageBody(message: WAWebJS.Message): string | null {
    if (message.body === "") return null;
    return message.body;
  }
}