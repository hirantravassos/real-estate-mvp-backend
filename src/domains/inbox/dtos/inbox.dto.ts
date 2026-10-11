import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { ValidateBoolean } from "../../../shared/decorators/validation/boolean.decorator";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { CustomerRole } from "../../customers/enums/customer-role.enum";

export class ConversationFilterDto extends PaginationRequestDto {
  @IsOptional()
  @IsString()
  search?: string | null;

  @IsOptional()
  @ValidateBoolean()
  archived?: boolean | null;

  @IsOptional()
  @ValidateBoolean()
  unreadOnly?: boolean | null;

  /** Only the chats with contacts of this kind. */
  @IsOptional()
  @IsEnum(CustomerRole)
  role?: CustomerRole | null;
}

export class ConversationUpdateDto {
  @IsOptional()
  @IsBoolean()
  archived?: boolean;

  @IsOptional()
  @IsUUID()
  customerId?: string | null;
}

export class MessageListDto {
  @IsOptional()
  @IsISO8601()
  before?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 40;
}

export class MessageTextSendDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  text: string;

  @IsOptional()
  @IsBoolean()
  aiGenerated?: boolean;
}

export class AttachmentUploadRequestDto {
  @IsString()
  @MaxLength(255)
  fileName: string;

  @IsString()
  @MaxLength(120)
  mimeType: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  sizeBytes: number;
}

export class MessageMediaSendDto {
  @IsString()
  @MaxLength(512)
  s3Key: string;

  @IsString()
  @MaxLength(120)
  mimeType: string;

  @IsString()
  @MaxLength(255)
  fileName: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  sizeBytes: number;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  caption?: string | null;

  /** Recorded in the app, goes as a WhatsApp voice note. */
  @IsOptional()
  @IsBoolean()
  voice?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationSeconds?: number | null;
}

export const REWRITE_TONES = [
  "friendly",
  "formal",
  "short",
  "persuasive",
  "fix",
] as const;
export type RewriteTone = (typeof REWRITE_TONES)[number];

export class AiSuggestionsDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  instruction?: string | null;
}

export class AiRewriteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  text: string;

  @IsIn(REWRITE_TONES)
  tone: RewriteTone;
}

export class PresentationPreviewDto {
  @IsUUID()
  propertyId: string;

  @IsBoolean()
  useAi: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  instruction?: string | null;
}

export class PresentationSendDto {
  @IsUUID()
  propertyId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  text: string;

  @IsArray()
  @ArrayMaxSize(30)
  @IsUUID("all", { each: true })
  mediaIds: string[];

  @IsBoolean()
  aiGenerated: boolean;
}
