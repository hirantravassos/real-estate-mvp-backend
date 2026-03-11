import { Customer } from "../../customers/entities/customer.entity";
import { WhatsappHelper } from "../helpers/whatsapp.helper";
import { WhatsappChatWithContactDto } from "./whatsapp-chat.mapper";

export class WhatsappContactMapper {
  static toDtoList(data: WhatsappChatWithContactDto[], customers?: Customer[]) {
    return data
      .filter((chat) => !chat.isGroup)
      .map((chat) => {
        const rawPhone = WhatsappHelper.getPhoneFromChat(chat);
        const customer = customers?.find(
          (customer) => customer.phone === rawPhone,
        );
        return {
          id: chat.id._serialized,
          name: WhatsappHelper.getNameFromChat(chat),
          phone: WhatsappHelper.getPhoneFromChat(chat),
          profile: chat.profile ?? null,
          customer: customer ?? null,
        };
      });
  }

  static toDto(chat: WhatsappChatWithContactDto, customer?: Customer) {
    return {
      id: chat.id._serialized,
      name: WhatsappHelper.getNameFromChat(chat, customer),
      phone: WhatsappHelper.getPhoneFromChat(chat, customer),
      profile: chat.profile ?? null,
      customer: customer ?? null,
    };
  }
}
