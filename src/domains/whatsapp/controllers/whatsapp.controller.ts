import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
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

  @Get()
  async findStatus(@GetUser() user: User) {
    return this.whatsappService.findStatus(user);
  }

  @Get("chats")
  async findAllChats(@GetUser() user: User) {
    return this.whatsappService.findAllChats(user);
  }

  @Get("chats/:whatsappId")
  async findAllMessages(
    @GetUser() user: User,
    @Param("whatsappId") whatsappId: string,
  ) {
    return this.whatsappService.findAllMessages(user, whatsappId);
  }

  @Post("connect")
  async connect(@GetUser() user: User) {
    return await this.whatsappService.connect(user);
  }

  @Delete("disconnect")
  async disconnect(@GetUser() user: User) {
    const fromSession = await this.whatsappService.disconnect(user);
    return this.whatsappSocketService.destroySession(fromSession.id);
  }
}
