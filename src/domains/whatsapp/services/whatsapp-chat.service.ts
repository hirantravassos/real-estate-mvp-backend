import { Injectable } from "@nestjs/common";
import { WhatsappChatRepository } from "../repositories/whatsapp-chat.repository";
import { User } from "../../users/entities/user.entity";
import { Chat } from "@whiskeysockets/baileys";
import { CreateWhatsappChatDto } from "../dtos/create-whatsapp-chat.dto";

@Injectable()
export class WhatsappChatService {
  constructor(private readonly chatRepository: WhatsappChatRepository) { }

  async saveChat(user: User, chat: Chat) {
    const whatsappId = chat?.id;

    const unread = (chat?.unreadCount ?? 0) > 0;

    if (!whatsappId) return;

    return await this.save({
      user,
      whatsappId,
      unread,
    });
  }

  private async save(chat: CreateWhatsappChatDto) {
    await this.chatRepository.upsert(chat, ["whatsappId", "userId"]);
  }
}
