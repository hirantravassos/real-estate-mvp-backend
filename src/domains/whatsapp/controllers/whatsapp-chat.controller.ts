import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { User } from "../../users/entities/user.entity";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { WhatsappChatsService } from "../services/whatsapp-chats.service";

@Controller("whatsapp-chats")
@UseGuards(JwtGuard)
export class WhatsappChatController {
  constructor(private readonly whatsappChatsService: WhatsappChatsService) {}

  @Get()
  async findAllChats(@GetUser() user: User) {
    return this.whatsappChatsService.findAllChats(user);
  }
}
