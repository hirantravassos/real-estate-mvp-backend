import { Injectable, NotFoundException } from "@nestjs/common";
import { WhatsappSessionRepository } from "../repositories/whatsapp-session.repository";
import { User } from "../../users/entities/user.entity";
import { WhatsappSocketService } from "./whatsapp-socket.service";
import { WhatsappChatRepository } from "../repositories/whatsapp-chat.repository";
import { WhatsappMessageRepository } from "../repositories/whatsapp-message.repository";
import { WhatsappContactRepository } from "../repositories/whatsapp-contact.repository";

@Injectable()
export class WhatsappService {
  constructor(
    private readonly sessionRepository: WhatsappSessionRepository,
    private readonly chatRepository: WhatsappChatRepository,
    private readonly messageRepository: WhatsappMessageRepository,
    private readonly contactRepository: WhatsappContactRepository,
    private readonly socketService: WhatsappSocketService,
  ) {}

  async connect(user: User) {
    const found = await this.sessionRepository.findOneBy({
      user: { id: user.id },
    });

    if (found) {
      await this.sessionRepository.delete({ id: found.id });
    }

    const newSession = await this.sessionRepository.save({
      user,
    });

    await this.socketService.start(newSession.id, user);

    return await this.findStatus(user);
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
    const session = await this.sessionRepository.findOneBy({
      user: { id: user.id },
    });

    if (!session) {
      return {
        status: "closed",
        name: user.name,
        qr: null,
      };
    }

    return session;
  }
}
