import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export const ASSISTANT_MAXIMUM_ATTACHMENTS = 10;

export const ASSISTANT_QUESTION_MAXIMUM_LENGTH = 2000;

export class AssistantAskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(ASSISTANT_QUESTION_MAXIMUM_LENGTH)
  text: string;

  @IsOptional()
  @IsBoolean()
  fromVoice?: boolean;

  /** Leave empty to start a new chat with this question. */
  @IsOptional()
  @IsUUID()
  chatId?: string;

  /** Files the broker attached to this question, uploaded before. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(ASSISTANT_MAXIMUM_ATTACHMENTS)
  @IsUUID("all", { each: true })
  attachmentIds?: string[];
}

export class AssistantUploadRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  mimeType: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  sizeBytes: number;
}

export class AssistantUploadDto {
  @IsString()
  @MaxLength(512)
  s3Key: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  mimeType: string;
}

export class AssistantHistoryDto {
  @IsOptional()
  @IsISO8601()
  before?: string;
}

export class AssistantChatRenameDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title: string;
}

export class AssistantChatListDto {
  @IsOptional()
  @IsISO8601()
  before?: string;
}

export class AssistantActionConfirmDto {
  /** The message text, when the broker edited it before sending. */
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  text?: string;
}
