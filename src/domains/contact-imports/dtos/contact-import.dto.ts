import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { CustomerRole } from "../../customers/enums/customer.enum";

export const CONTACT_SOURCES = ["whatsapp", "google"] as const;
export type ContactSource = (typeof CONTACT_SOURCES)[number];

/** Contacts the AI reads in one call, the screen sends them in batches. */
export const AI_ANALYSIS_BATCH_SIZE = 8;

/** Contacts saved in one call, the screen sends them in batches. */
export const IMPORT_BATCH_SIZE = 100;

export class GoogleContactsDto {
  @IsString()
  @MinLength(10)
  @MaxLength(4096)
  accessToken: string;
}

export class ContactAnalysisItemDto {
  @IsString()
  @MaxLength(30)
  phone: string;

  @IsString()
  @MaxLength(120)
  chatJid: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string | null;
}

export class ContactAnalysisDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(AI_ANALYSIS_BATCH_SIZE)
  @ValidateNested({ each: true })
  @Type(() => ContactAnalysisItemDto)
  contacts: ContactAnalysisItemDto[];
}

export class ContactImportItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(30)
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  chatJid?: string | null;

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
}

export class ContactImportDto {
  @IsIn(CONTACT_SOURCES)
  source: ContactSource;

  /** Funnel stage for the contacts that do not bring their own. */
  @IsOptional()
  @IsUUID()
  kanbanId?: string | null;

  /** Brings the WhatsApp conversation so far into the inbox. */
  @IsBoolean()
  importHistory: boolean;

  /** Builds each character from the public WhatsApp photo, charged per photo. */
  @IsOptional()
  @IsBoolean()
  avatarFromPhoto?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(IMPORT_BATCH_SIZE)
  @ValidateNested({ each: true })
  @Type(() => ContactImportItemDto)
  contacts: ContactImportItemDto[];
}

export class ContactDirectoryFilterDto {
  @IsString()
  @MaxLength(80)
  search: string;
}

/** One contact of the WhatsApp or the address book, saved as a customer now. */
export class ContactAddDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(30)
  phone: string;

  /** Role of a brand new customer, an existing one keeps its roles. */
  @IsOptional()
  @IsEnum(CustomerRole)
  role?: CustomerRole | null;
}
