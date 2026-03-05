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
    lastSentAt?: string | null,
  ): Promise<void> {
    if (!whatsappId) return;

    const payload: Record<string, unknown> = { user, whatsappId, unread };

    if (lastSentAt) payload.lastSentAt = lastSentAt;

    await this.chatRepository.upsert(payload, ["whatsappId", "userId"]);
  }
}
