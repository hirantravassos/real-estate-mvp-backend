import { Customer } from "../../customers/entities/customer.entity";
import { WhatsappHelper } from "../helpers/whatsapp.helper";
import { WAWebCustomChatWithContactDto } from "./whatsapp-chat.mapper";
import { WhatsappChat } from "../entities/whatsapp-chat.entity";

export class WhatsappContactMapper {
  static toDtoList(data: WhatsappChat[]) {
    return data.map((chat) => {
      return {
        id: chat.id,
        name: chat?.name,
        phone: chat?.phone,
        profile: chat.profileUrl ?? null,
        lastSentAt: chat.lastSentAt ?? null,
      };
    });
  }

  static toDto(chat: WAWebCustomChatWithContactDto, customer?: Customer) {
    return {
      id: chat.id._serialized,
      name: WhatsappHelper.getNameFromChat(chat, customer),
      phone: WhatsappHelper.getPhoneFromChat(chat, customer),
      profile: chat.profile ?? null,
      customer: customer ?? null,
    };
  }
}
