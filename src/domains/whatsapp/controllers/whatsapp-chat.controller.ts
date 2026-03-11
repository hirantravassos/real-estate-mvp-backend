import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { User } from "../../users/entities/user.entity";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { WhatsappChatsService } from "../services/whatsapp-chats.service";

@Controller("whatsapp-chats")
@UseGuards(JwtGuard)
export class WhatsappChatController {
  constructor(private readonly whatsappChatsService: WhatsappChatsService) {}

  @Get()
  async findAll(@GetUser() user: User) {
    return this.whatsappChatsService.findAll(user);
  }

  @Get(":id")
  async findOne(@GetUser() user: User, @Param("id") id: string) {
    return this.whatsappChatsService.findOne(user, id);
  }
}
