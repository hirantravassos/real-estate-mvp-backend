import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
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
  AssistantHistoryDto,
} from "../dtos/assistant.dto";
import { AssistantActionService } from "../services/assistant-action.service";
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
  ) {}

  @Get("messages")
  history(@GetUser() user: User, @Query() dto: AssistantHistoryDto) {
    return this.assistantService.history(user, dto);
  }

  @Post("messages")
  ask(@GetUser() user: User, @Body() dto: AssistantAskDto) {
    return this.assistantService.ask(user, dto);
  }

  @Delete("messages")
  clear(@GetUser() user: User) {
    return this.assistantService.clear(user);
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
