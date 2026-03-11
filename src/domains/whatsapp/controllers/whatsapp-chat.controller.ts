import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { User } from "../../users/entities/user.entity";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { WhatsappChatsService } from "../services/whatsapp-chats.service";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";

@Controller("whatsapp-chats")
@UseGuards(JwtGuard)
export class WhatsappChatController {
  constructor(private readonly whatsappChatsService: WhatsappChatsService) {}

  @Get()
  async findAll(
    @GetUser() user: User,
    @Query() pagination: PaginationRequestDto,
  ) {
    return this.whatsappChatsService.findAll(user, pagination);
  }

  @Get(":id")
  async findOne(@GetUser() user: User, @Param("id") id: string) {
    return this.whatsappChatsService.findOne(user, id);
  }
}
