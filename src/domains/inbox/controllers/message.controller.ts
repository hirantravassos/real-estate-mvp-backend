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
  MessageAttachmentSaveDto,
  MessageListDto,
  MessageMediaSendDto,
  MessageTextSendDto,
  ProfileCardSendDto,
} from "../dtos/inbox.dto";
import { MessageAttachmentService } from "../services/message-attachment.service";
import { MessageService } from "../services/message.service";
import { ProfileCardSenderService } from "../services/profile-card-sender.service";

@Controller("inbox")
@UseGuards(JwtGuard)
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly messageAttachmentService: MessageAttachmentService,
    private readonly profileCardSenderService: ProfileCardSenderService,
  ) {}

  /** Sends the broker's profile card to the chosen chats, paced by the safety queue. */
  @Post("profile-card")
  sendProfileCard(@GetUser() user: User, @Body() dto: ProfileCardSendDto) {
    return this.profileCardSenderService.send(user, dto);
  }

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

  /** Keeps the photo or file of a message in a customer, property or sale. */
  @Post("messages/:messageId/save")
  saveAttachment(
    @GetUser() user: User,
    @Param("messageId", ParseUUIDPipe) messageId: string,
    @Body() dto: MessageAttachmentSaveDto,
  ) {
    return this.messageAttachmentService.save(user, messageId, dto);
  }
}
