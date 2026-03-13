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
  WhatsappChatSendMessageDto,
  WhatsappChatService,
} from "../services/whatsapp-chat.service";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";

@Controller("whatsapp-chats")
@UseGuards(JwtGuard)
export class WhatsappChatController {
  constructor(private readonly whatsappChatsService: WhatsappChatService) {}

  @Get("messages/:messageId/media")
  async findMedia(
    @GetUser() user: User,
    @Param("messageId") messageId: string,
  ) {
    return this.whatsappChatsService.findMessageMedia(user, messageId);
  }

  @Get("unread")
  async findAllUnread(
    @GetUser() user: User,
    @Query() pagination: PaginationRequestDto,
  ) {
    return this.whatsappChatsService.findAllUnread(user, pagination);
  }

  @Get()
  async findAll(
    @GetUser() user: User,
    @Query() pagination: PaginationRequestDto,
  ) {
    return this.whatsappChatsService.findAll(user, pagination);
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
