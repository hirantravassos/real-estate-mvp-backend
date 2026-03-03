import { Controller, Delete, Post, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { WhatsappService } from "../services/whatsapp.service";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { User } from "../../users/entities/user.entity";
import { WhatsappSocketService } from "../services/whatsapp-socket.service";

@Controller("whatsapp")
@UseGuards(JwtGuard)
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly whatsappSocketService: WhatsappSocketService,
  ) {}

  @Post("connect")
  async connect(@GetUser() user: User) {
    const newSession = await this.whatsappService.connect(user);
    return this.whatsappSocketService.initializeSession(newSession.id);
  }

  @Delete("disconnect")
  async disconnect(@GetUser() user: User) {
    const fromSession = await this.whatsappService.disconnect(user);
    return this.whatsappSocketService.destroySession(fromSession.id);
  }
}
