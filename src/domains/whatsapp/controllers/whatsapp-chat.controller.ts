import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { User } from "../../users/entities/user.entity";
import { WhatsappChatService } from "../services/whatsapp-chat.service";
import { WhatsappSendMessageDto } from "../dtos/whatsapp-send-message.dto";

@Controller("whatsapp-chats")
@UseGuards(JwtGuard)
export class WhatsappChatController {
  constructor(private readonly whatsappChatService: WhatsappChatService) {}

  @Get()
  async findAll(@GetUser() user: User) {
    return this.whatsappChatService.findAll(user);
  }

  @Get("by-phone/:phone")
  async findOneByPhone(
    @GetUser() user: User,
    @Param("phone") phone: string,
  ) {
    return this.whatsappChatService.findOneByPhone(user, phone);
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

  @Post(":whatsappId/messages")
  async sendMessage(
    @GetUser() user: User,
    @Param("whatsappId") whatsappId: string,
    @Body() dto: WhatsappSendMessageDto,
  ) {
    return this.whatsappChatService.sendTextMessage(
      user,
      whatsappId,
      dto.content,
    );
  }
}
