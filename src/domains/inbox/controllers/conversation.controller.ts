import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { User } from "../../users/entities/user.entity";
import {
  AiRewriteDto,
  AiSuggestionsDto,
  ConversationFilterDto,
  ConversationUpdateDto,
  PresentationPreviewDto,
  PresentationSendDto,
} from "../dtos/inbox.dto";
import { ConversationService } from "../services/conversation.service";
import { InboxAiService } from "../services/inbox-ai.service";
import { PropertyPresentationSenderService } from "../services/property-presentation-sender.service";

@Controller("inbox/conversations")
@UseGuards(JwtGuard)
export class ConversationController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly inboxAiService: InboxAiService,
    private readonly presentationService: PropertyPresentationSenderService,
  ) {}

  @Get()
  findAll(@GetUser() user: User, @Query() filter: ConversationFilterDto) {
    return this.conversationService.findAll(user, filter);
  }

  @Get("unread")
  unread(@GetUser() user: User) {
    return this.conversationService.unreadSummary(user);
  }

  @Post("customers/:customerId")
  openForCustomer(
    @GetUser() user: User,
    @Param("customerId", ParseUUIDPipe) customerId: string,
  ) {
    return this.conversationService.openForCustomer(user, customerId);
  }

  @Get(":id")
  findOne(@GetUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    return this.conversationService.findOne(user, id);
  }

  @Patch(":id")
  update(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ConversationUpdateDto,
  ) {
    return this.conversationService.update(user, id, dto);
  }

  @Post(":id/read")
  markAsRead(@GetUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    return this.conversationService.markAsRead(user, id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@GetUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    await this.conversationService.remove(user, id);
  }

  @Post(":id/ai/suggestions")
  suggestions(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AiSuggestionsDto,
  ) {
    return this.inboxAiService.suggestReplies(user, id, dto.instruction);
  }

  @Post(":id/ai/rewrite")
  rewrite(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AiRewriteDto,
  ) {
    return this.inboxAiService.rewrite(user, id, dto.text, dto.tone);
  }

  @Post(":id/presentations/preview")
  previewPresentation(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: PresentationPreviewDto,
  ) {
    return this.presentationService.preview(user, id, dto);
  }

  @Post(":id/presentations")
  sendPresentation(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: PresentationSendDto,
  ) {
    return this.presentationService.send(user, id, dto);
  }
}
