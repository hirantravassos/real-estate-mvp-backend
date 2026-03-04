import { Injectable } from "@nestjs/common";
import { WhatsappChatRepository } from "../repositories/whatsapp-chat.repository";
import { User } from "../../users/entities/user.entity";

@Injectable()
export class WhatsappChatService {
  constructor(private readonly chatRepository: WhatsappChatRepository) {}

  async upsertChat(
    user: User,
    whatsappId: string,
    unread: boolean,
  ): Promise<void> {
    if (!whatsappId) return;

    await this.chatRepository.upsert({ user, whatsappId, unread }, [
      "whatsappId",
      "userId",
    ]);
  }
}
