import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { User } from "../../users/entities/user.entity";
import {
  WhatsappAccountService,
  WhatsappConnectDto,
  WhatsappRequestOtpDto,
  WhatsappSelectPhoneDto,
  WhatsappSendMessageDto,
  WhatsappVerifyOtpDto,
} from "../services/whatsapp-account.service";
import { WhatsappChatService } from "../services/whatsapp-chat.service";

@Controller("whatsapp")
@UseGuards(JwtGuard)
export class WhatsappController {
  constructor(
    private readonly accountService: WhatsappAccountService,
    private readonly chatService: WhatsappChatService,
  ) {}

  // ── Account ──────────────────────────────────────────────

  @Get("account")
  getAccount(@GetUser() user: User) {
    return this.accountService.getAccount(user);
  }

  @Post("connect")
  connectFacebook(@GetUser() user: User, @Body() dto: WhatsappConnectDto) {
    return this.accountService.connectFacebook(user, dto);
  }

  @Delete("disconnect")
  disconnect(@GetUser() user: User) {
    return this.accountService.disconnect(user);
  }

  // ── Phone number management ───────────────────────────────

  @Get("phone-numbers")
  getPhoneNumbers(@GetUser() user: User) {
    return this.accountService.getAvailablePhoneNumbers(user);
  }

  @Post("phone-numbers/select")
  selectPhone(@GetUser() user: User, @Body() dto: WhatsappSelectPhoneDto) {
    return this.accountService.selectPhone(user, dto);
  }

  @Post("phone-numbers/request-otp")
  requestOtp(@GetUser() user: User, @Body() dto: WhatsappRequestOtpDto) {
    return this.accountService.requestOtp(user, dto);
  }

  @Post("phone-numbers/verify-otp")
  verifyOtp(@GetUser() user: User, @Body() dto: WhatsappVerifyOtpDto) {
    return this.accountService.verifyOtp(user, dto);
  }

  // ── Chats & messages ──────────────────────────────────────

  @Get("chats")
  getChats(@GetUser() user: User) {
    return this.chatService.findAllChats(user);
  }

  @Get("chats/:id")
  getChat(@GetUser() user: User, @Param("id") id: string) {
    return this.chatService.findChat(user, id);
  }

  @Get("chats/:id/messages")
  getMessages(
    @GetUser() user: User,
    @Param("id") id: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.chatService.getMessages(
      user,
      id,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Post("chats/:id/messages")
  sendMessage(
    @GetUser() user: User,
    @Param("id") id: string,
    @Body() dto: WhatsappSendMessageDto,
  ) {
    return this.chatService.sendMessage(user, id, dto);
  }
}
