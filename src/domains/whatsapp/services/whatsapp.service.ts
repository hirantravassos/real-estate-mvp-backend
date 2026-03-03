import { Injectable, NotFoundException } from "@nestjs/common";
import { WhatsappSessionRepository } from "../repositories/whatsapp-session.repository";
import { User } from "../../users/entities/user.entity";
import { WhatsappContactRepository } from "../repositories/whatsapp-contact.repository";
import { WhatsappChatRepository } from "../repositories/whatsapp-chat.repository";
import { WhatsappMessageRepository } from "../repositories/whatsapp-message.repository";

@Injectable()
export class WhatsappService {
  constructor(
    private readonly sessionRepository: WhatsappSessionRepository,
    private readonly contactRepository: WhatsappContactRepository,
    private readonly chatRepository: WhatsappChatRepository,
    private readonly messageRepository: WhatsappMessageRepository,
  ) {}

  async connect(user: User) {
    const found = await this.sessionRepository.findOneBy({
      user: { id: user.id },
    });

    if (found) {
      await this.sessionRepository.delete({ id: found.id });
    }

    return await this.sessionRepository.save({
      user,
    });
  }

  async disconnect(user: User) {
    const found = await this.sessionRepository
      .findOneByOrFail({
        user: { id: user.id },
      })
      .catch(() => {
        throw new NotFoundException("Whatsapp session not found");
      });
    await this.sessionRepository.delete({ id: found.id });
    return found;
  }

  async findStatus(user: User) {
    return this.sessionRepository
      .findOneByOrFail({ user: { id: user.id } })
      .catch(() => {
        throw new NotFoundException("Whatsapp session not found");
      });
  }

  async findAllChats(user: User) {
    return this.chatRepository.find({
      where: { user: { id: user.id } },
      relations: {
        contact: true,
        messages: true,
      },
      order: {
        messages: {
          timestamp: "DESC",
        },
      },
    });
  }
}
