import { Injectable } from "@nestjs/common";
import { User } from "../../users/entities/user.entity";
import { WhatsappSessionService } from "./whatsapp-session.service";
import { WhatsappConnectionStatusEnum } from "../enums/whatsapp-connection-status.enum";
import { WhatsappSocketService } from "./whatsapp-socket.service";

@Injectable()
export class WhatsappService {
  constructor(
    private readonly sessionService: WhatsappSessionService,
    private readonly socketService: WhatsappSocketService,
  ) {}

  async disconnect(user: User) {
    const found = await this.sessionService.findOne(user);
    await this.sessionService.save(found.user, {
      qr: null,
      name: found.user.name,
      status: WhatsappConnectionStatusEnum.CLOSED,
    });
    return found;
  }

  async findStatus(user: User) {
    return await this.sessionService.findOne(user).catch(async () => {
      const newSession = await this.sessionService.save(user, {
        qr: null,
        status: WhatsappConnectionStatusEnum.CLOSED,
        name: user.name,
      });

      await this.socketService.start(newSession.id, user);

      return newSession;
    });
  }
}
