import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { User } from "../../users/entities/user.entity";
import {
  AssistantActionConfirmDto,
  AssistantAskDto,
  AssistantChatListDto,
  AssistantChatRenameDto,
  AssistantHistoryDto,
  AssistantUploadDto,
  AssistantUploadRequestDto,
} from "../dtos/assistant.dto";
import { AssistantDocumentService } from "../services/assistant-document.service";
import { AssistantActionService } from "../services/assistant-action.service";
import { AssistantChatService } from "../services/assistant-chat.service";
import { AssistantService } from "../services/assistant.service";

/** Formats the transcription accepts, by what browsers record. */
const EXTENSION_BY_AUDIO_TYPE: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/m4a": "m4a",
  "audio/aac": "m4a",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "video/webm": "webm",
  "video/mp4": "mp4",
};

const MAXIMUM_VOICE_BYTES = 10 * 1024 * 1024;

const baseTypeOf = (mimeType: string) => mimeType.split(";")[0].trim();

@Controller("assistant")
@UseGuards(JwtGuard)
export class AssistantController {
  constructor(
    private readonly assistantService: AssistantService,
    private readonly actionService: AssistantActionService,
    private readonly documentService: AssistantDocumentService,
    private readonly chatService: AssistantChatService,
  ) {}

  /** Where the browser puts a file attached in the chat, before asking. */
  @Post("uploads/presigned")
  presignUpload(@GetUser() user: User, @Body() dto: AssistantUploadRequestDto) {
    return this.documentService.presignUpload(user, dto);
  }

  @Post("uploads")
  registerUpload(@GetUser() user: User, @Body() dto: AssistantUploadDto) {
    return this.documentService.registerUpload(user, dto);
  }

  /** Download link of a file the assistant made or one attached in the chat. */
  @Get("files/:documentId")
  fileUrl(
    @GetUser() user: User,
    @Param("documentId", ParseUUIDPipe) documentId: string,
  ) {
    return this.documentService.downloadUrl(user, documentId);
  }

  @Get("chats")
  chats(@GetUser() user: User, @Query() dto: AssistantChatListDto) {
    return this.chatService.list(user, dto);
  }

  @Get("chats/:chatId/messages")
  history(
    @GetUser() user: User,
    @Param("chatId", ParseUUIDPipe) chatId: string,
    @Query() dto: AssistantHistoryDto,
  ) {
    return this.assistantService.history(user, chatId, dto);
  }

  @Patch("chats/:chatId")
  renameChat(
    @GetUser() user: User,
    @Param("chatId", ParseUUIDPipe) chatId: string,
    @Body() dto: AssistantChatRenameDto,
  ) {
    return this.chatService.rename(user, chatId, dto.title);
  }

  @Delete("chats/:chatId")
  removeChat(
    @GetUser() user: User,
    @Param("chatId", ParseUUIDPipe) chatId: string,
  ) {
    return this.chatService.remove(user, chatId);
  }

  /** Asks in a chat, or starts a new one when no chat is given. */
  @Post("messages")
  ask(@GetUser() user: User, @Body() dto: AssistantAskDto) {
    return this.assistantService.ask(user, dto);
  }

  @Post("transcriptions")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: MAXIMUM_VOICE_BYTES },
      fileFilter: (_request, file, callback) => {
        if (EXTENSION_BY_AUDIO_TYPE[baseTypeOf(file.mimetype)]) {
          callback(null, true);
          return;
        }
        callback(
          new BadRequestException("Formato de áudio não aceito."),
          false,
        );
      },
    }),
  )
  transcribe(
    @GetUser() user: User,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file?.size) throw new BadRequestException("Áudio é obrigatório.");
    const mimeType = baseTypeOf(file.mimetype);
    return this.assistantService.transcribe(user, {
      audio: file.buffer,
      mimeType,
      fileName: `voz.${EXTENSION_BY_AUDIO_TYPE[mimeType]}`,
    });
  }

  @Post("actions/:actionId/confirm")
  confirm(
    @GetUser() user: User,
    @Param("actionId", ParseUUIDPipe) actionId: string,
    @Body() dto: AssistantActionConfirmDto,
  ) {
    return this.actionService.confirm(user, actionId, dto);
  }

  @Post("actions/:actionId/cancel")
  cancel(
    @GetUser() user: User,
    @Param("actionId", ParseUUIDPipe) actionId: string,
  ) {
    return this.actionService.cancel(user, actionId);
  }
}
