import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { User } from "../../users/entities/user.entity";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import {
  WhatsappChatFilterDto,
  WhatsappChatSendMessageDto,
  WhatsappChatService,
} from "../services/whatsapp-chat.service";

@Controller("whatsapp-chats")
@UseGuards(JwtGuard)
export class WhatsappChatController {
  constructor(private readonly whatsappChatsService: WhatsappChatService) {}

  @Post("refresh-all")
  async refreshAll(@GetUser() user: User) {
    return this.whatsappChatsService.refreshAll(user);
  }

  @Get("messages/:messageId/media")
  async findMedia(
    @GetUser() user: User,
    @Param("messageId") messageId: string,
  ) {
    return this.whatsappChatsService.findMessageMedia(user, messageId);
  }

  @Get()
  async findAll(@GetUser() user: User, @Query() filter: WhatsappChatFilterDto) {
    return this.whatsappChatsService.findAll(user, filter);
  }

  @Get(":id")
  async findOne(
    @GetUser() user: User,
    @Param("id") id: string,
    @Query("limit") limit: number,
  ) {
    return this.whatsappChatsService.findOne(user, id, limit);
  }

  @Post(":id/messages")
  async sendMessage(
    @GetUser() user: User,
    @Param("id") id: string,
    @Body() dto: WhatsappChatSendMessageDto,
  ) {
    await this.whatsappChatsService.sendMessage(user, id, dto);
  }

  @Post(":id/ignore")
  async ignore(@GetUser() user: User, @Param("id") id: string) {
    return this.whatsappChatsService.ignore(user, id);
  }
}
