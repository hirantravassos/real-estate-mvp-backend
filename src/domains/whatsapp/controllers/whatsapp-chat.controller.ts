import { Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { User } from "../../users/entities/user.entity";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { WhatsappChatsService } from "../services/whatsapp-chats.service";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { SkipThrottle } from "@nestjs/throttler";

@Controller("whatsapp-chats")
@UseGuards(JwtGuard)
export class WhatsappChatController {
  constructor(private readonly whatsappChatsService: WhatsappChatsService) {}

  @SkipThrottle()
  @Get("messages/:messageId/media")
  async findMedia(
    @GetUser() user: User,
    @Param("messageId") messageId: string,
  ) {
    return this.whatsappChatsService.findMessageMedia(user, messageId);
  }

  @Get("unread")
  async findAllUnread(@GetUser() user: User) {
    return this.whatsappChatsService.findAllUnread(user);
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

  @Post(":id/ignore")
  async ignore(@GetUser() user: User, @Param("id") id: string) {
    return this.whatsappChatsService.ignore(user, id);
  }
}
