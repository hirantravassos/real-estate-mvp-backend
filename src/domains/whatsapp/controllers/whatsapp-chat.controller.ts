import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { User } from "../../users/entities/user.entity";
import { WhatsappChatService } from "../services/whatsapp-chat.service";

@Controller("whatsapp-chats")
@UseGuards(JwtGuard)
export class WhatsappChatController {
  constructor(private readonly whatsappChatService: WhatsappChatService) {}

  @Get()
  async findAll(@GetUser() user: User) {
    return this.whatsappChatService.findAll(user);
  }

  @Get(":whatsappId")
  async findOne(
    @GetUser() user: User,
    @Param("whatsappId") whatsappId: string,
  ) {
    return this.whatsappChatService.findOne(user, whatsappId);
  }

  @Post(":whatsappId/seen")
  async markChatAsSeen(
    @GetUser() user: User,
    @Param("whatsappId") whatsappId: string,
  ) {
    return this.whatsappChatService.markChatAsSeen(user, whatsappId);
  }
}
