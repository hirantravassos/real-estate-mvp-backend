import {
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { User } from "../../users/entities/user.entity";
import {
  AttachmentUploadRequestDto,
  MessageListDto,
  MessageMediaSendDto,
  MessageTextSendDto,
} from "../dtos/inbox.dto";
import { MessageService } from "../services/message.service";

@Controller("inbox")
@UseGuards(JwtGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get("conversations/:conversationId/messages")
  findAll(
    @GetUser() user: User,
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
    @Query() dto: MessageListDto,
  ) {
    return this.messageService.findAll(user, conversationId, dto);
  }

  @Post("conversations/:conversationId/messages")
  sendText(
    @GetUser() user: User,
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
    @Body() dto: MessageTextSendDto,
  ) {
    return this.messageService.sendText(user, conversationId, dto.text, {
      aiGenerated: dto.aiGenerated ?? false,
    });
  }

  @Post("conversations/:conversationId/attachments/presigned-upload")
  presignAttachment(
    @GetUser() user: User,
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
    @Body() dto: AttachmentUploadRequestDto,
  ) {
    return this.messageService.presignAttachment(user, conversationId, dto);
  }

  @Post("conversations/:conversationId/media")
  sendMedia(
    @GetUser() user: User,
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
    @Body() dto: MessageMediaSendDto,
  ) {
    return this.messageService.sendMedia(user, conversationId, dto);
  }

  @Post("messages/:messageId/retry")
  retry(
    @GetUser() user: User,
    @Param("messageId", ParseUUIDPipe) messageId: string,
  ) {
    return this.messageService.retry(user, messageId);
  }

  @Get("messages/:messageId/media")
  mediaUrl(
    @GetUser() user: User,
    @Param("messageId", ParseUUIDPipe) messageId: string,
    @Query("download", new ParseBoolPipe({ optional: true }))
    download?: boolean,
  ) {
    return this.messageService.mediaUrl(user, messageId, download ?? false);
  }
}
