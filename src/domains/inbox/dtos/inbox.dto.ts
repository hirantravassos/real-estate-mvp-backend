import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsBase64,
  IsNumberString,
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
  ValidateIf,
} from "class-validator";
import { ValidateBoolean } from "../../../shared/decorators/validation/boolean.decorator";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { MessageAttachmentTarget } from "../enums/inbox.enum";

/** Without a phone the broker scans a QR code, with it they type a pairing code. */
export class WhatsappConnectDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string | null;
}

export class ConversationFilterDto extends PaginationRequestDto {
  @IsOptional()
  @IsString()
  search?: string | null;

  @IsOptional()
  @ValidateBoolean()
  archived?: boolean | null;

  @IsOptional()
  @ValidateBoolean()
  hidden?: boolean | null;

  @IsOptional()
  @ValidateBoolean()
  unreadOnly?: boolean | null;
}

export class ConversationUpdateDto {
  @IsOptional()
  @IsBoolean()
  archived?: boolean;

  @IsOptional()
  @IsBoolean()
  hidden?: boolean;

  @IsOptional()
  @IsUUID()
  customerId?: string | null;
}

/** Saves the contact of a chat as a customer, from the inbox. */
export class ConversationCustomerCreateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsUUID()
  kanbanId?: string | null;

  @IsOptional()
  @IsNumberString()
  @MaxLength(16)
  budget?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null;

  /** Builds the character from the public WhatsApp photo, charged per photo. */
  @IsOptional()
  @IsBoolean()
  avatarFromPhoto?: boolean;
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

/** Most contacts one profile card goes to at once, more looks like a blast. */
export const PROFILE_CARD_MAXIMUM_CONTACTS = 20;

/** About 3 MB of image, a 1080 px card is far below it. */
const PROFILE_CARD_MAXIMUM_BASE64_LENGTH = 4 * 1024 * 1024;

/**
 * The broker's own card, drawn in the browser, sent from their WhatsApp to
 * the chosen chats. "{nome}" in the text becomes each contact's first name.
 */
export class ProfileCardSendDto {
  @IsBase64()
  @MaxLength(PROFILE_CARD_MAXIMUM_BASE64_LENGTH, {
    message: "A imagem do cartão está grande demais.",
  })
  image: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  caption: string;

  @IsArray()
  @ArrayMinSize(1, { message: "Escolha pelo menos um contato." })
  @ArrayMaxSize(PROFILE_CARD_MAXIMUM_CONTACTS, {
    message: `Escolha no máximo ${PROFILE_CARD_MAXIMUM_CONTACTS} contatos por vez.`,
  })
  @ArrayUnique()
  @IsUUID("all", { each: true })
  conversationIds: string[];
}

/** Keeps the photo or file of a message in a customer, property or sale. */
export class MessageAttachmentSaveDto {
  @IsEnum(MessageAttachmentTarget)
  target: MessageAttachmentTarget;

  /** The customer, the property or the sale that receives the file. */
  @IsUUID()
  recordId: string;

  /** Item of the sale checklist, needed when the target is a sale. */
  @ValidateIf(
    (dto: MessageAttachmentSaveDto) =>
      dto.target === MessageAttachmentTarget.DEAL_ITEM,
  )
  @IsUUID()
  checklistItemId?: string | null;

  /** Which suggested document of the property this file is. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string | null;
}
