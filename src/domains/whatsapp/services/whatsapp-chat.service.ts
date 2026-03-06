import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { WhatsappChatRepository } from "../repositories/whatsapp-chat.repository";
import { User } from "../../users/entities/user.entity";
import { WhatsappSocketService } from "./whatsapp-socket.service";
import { WhatsappGateway } from "../gateways/whatsapp.gateway";
import { WhatsappContactService } from "./whatsapp-contact.service";
import { WhatsappMessageService } from "./whatsapp-message.service";
import { WhatsappContact } from "../entities/whatsapp-contact.entity";

export interface WhatsappChatCreateDto {
  unread: boolean;
  lastSentAt?: string | null;
}

@Injectable()
export class WhatsappChatService {
  constructor(
    @Inject(forwardRef(() => WhatsappSocketService))
    private readonly socketService: WhatsappSocketService,
    @Inject(forwardRef(() => WhatsappGateway))
    private readonly gateway: WhatsappGateway,
    private readonly chatRepository: WhatsappChatRepository,
    private readonly messageService: WhatsappMessageService,
    private readonly contactService: WhatsappContactService,
  ) {}

  async findAll(user: User) {
    const userId = user.id;

    return await this.chatRepository
      .createQueryBuilder("chat")
      .innerJoinAndMapOne(
        "chat.contact",
        WhatsappContact,
        "contact",
        "contact.whatsappId = chat.whatsappId AND contact.userId = chat.userId AND contact.phoneNumber IS NOT NULL",
      )
      .addSelect(
        "CASE WHEN chat.lastSentAt IS NULL THEN 1 ELSE 0 END",
        "lastSentAtIsNull",
      )
      .where("chat.userId = :userId", { userId })
      .orderBy("lastSentAtIsNull", "ASC")
      .addOrderBy("chat.lastSentAt", "DESC")
      .take(100)
      .getMany();
  }

  async findOne(user: User, whatsappId: string) {
    const chat = await this.chatRepository.findOne({
      where: { whatsappId, userId: user.id },
    });
    const contact = await this.contactService.findOne(user, whatsappId);
    const messages = await this.messageService.findAll(user.id, whatsappId);

    return {
      ...chat,
      contact,
      messages,
    };
  }

  async save(
    user: User,
    whatsappId: string,
    dto: WhatsappChatCreateDto,
  ): Promise<void> {
    const { unread, lastSentAt } = dto;

    const payload: Record<string, unknown> = { user, whatsappId, unread };
    payload.lastSentAt = await this.getLastSentAt(user, whatsappId, lastSentAt);

    await this.chatRepository.upsert(payload, ["whatsappId", "userId"]);
    void this.gateway.emitChatsUpdate(user);
    void this.gateway.emitChatUpdate(user, whatsappId);
  }

  async markChatAsSeen(user: User, whatsappId: string) {
    const socket = await this.socketService.getSocketByUserOrFail(user?.id);
    const messages = await this.messageService.findAll(user.id, whatsappId);

    console.log("marked as Seen", messages);

    const keys = messages?.map((message) => ({
      remoteJid: whatsappId,
      id: message.messageId,
    }));

    if (keys?.length > 0) {
      await socket.readMessages(keys);
    }

    await this.chatRepository.update(
      { userId: user.id, whatsappId },
      { unread: false },
    );

    return messages;
  }

  private async getLastSentAt(
    user: User,
    whatsappId: string,
    lastSentAt?: string | null,
  ) {
    const existingChat = await this.chatRepository.findOne({
      where: {
        whatsappId: whatsappId,
        user: { id: user.id },
      },
    });

    const existingTimestamp = existingChat?.lastSentAt;

    if (!lastSentAt) return existingTimestamp;

    if (!existingTimestamp || lastSentAt > existingTimestamp) {
      return lastSentAt;
    }

    return lastSentAt;
  }
}
