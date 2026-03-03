import { Injectable, NotFoundException } from "@nestjs/common";
import { WhatsappSessionRepository } from "../repositories/whatsapp-session.repository";
import { User } from "../../users/entities/user.entity";

@Injectable()
export class WhatsappService {
  constructor(
    private readonly whatsappSessionRepository: WhatsappSessionRepository,
  ) {}

  async connect(user: User) {
    const found = await this.whatsappSessionRepository.findOneBy({
      user: { id: user.id },
    });

    if (found) {
      await this.whatsappSessionRepository.delete({ id: found.id });
    }

    return await this.whatsappSessionRepository.save({
      user,
    });
  }

  async disconnect(user: User) {
    const found = await this.whatsappSessionRepository
      .findOneByOrFail({
        user: { id: user.id },
      })
      .catch(() => {
        throw new NotFoundException("Whatsapp session not found");
      });
    await this.whatsappSessionRepository.delete({ id: found.id });
    return found;
  }
}
