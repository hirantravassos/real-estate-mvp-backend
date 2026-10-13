import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { ValidatePhoneNumber } from "../../../shared/decorators/validation/phone-number.decorator";
import { SLUG_MAX_LENGTH, SLUG_PATTERN } from "../helpers/user-slug.helper";

const MAXIMUM_TAGS = 20;
const TAG_MAX_LENGTH = 80;

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

/** Empty strings become null, so optional fields can be cleared. */
const trimOrNull = ({ value }: { value: unknown }) => {
  if (typeof value !== "string") return value;
  return value.trim() || null;
};

/** Trims every tag, drops the empty ones and the repeated ones. */
const cleanTags = ({ value }: { value: unknown }): unknown => {
  if (!Array.isArray(value)) return value;
  const seen = new Set<string>();
  return (value as unknown[])
    .map((item) => (typeof item === "string" ? item.trim() : item))
    .filter((item) => {
      if (typeof item !== "string") return true;
      const key = item.toLowerCase();
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export class UserProfileUpdateDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: "Informe a sua cidade" })
  @MinLength(2, { message: "Informe a sua cidade" })
  @MaxLength(120)
  city: string;

  @IsOptional()
  @Transform(trimOrNull)
  @ValidatePhoneNumber({ isOptional: true })
  phone?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(30)
  creci?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(500, { message: "A apresentação pode ter até 500 caracteres" })
  bio?: string | null;

  @IsOptional()
  @Transform(cleanTags)
  @IsArray()
  @ArrayMaxSize(MAXIMUM_TAGS)
  @IsString({ each: true })
  @MaxLength(TAG_MAX_LENGTH, { each: true })
  workingCities?: string[];

  @IsOptional()
  @Transform(cleanTags)
  @IsArray()
  @ArrayMaxSize(MAXIMUM_TAGS)
  @IsString({ each: true })
  @MaxLength(TAG_MAX_LENGTH, { each: true })
  salesNiches?: string[];

  @IsOptional()
  @Transform(cleanTags)
  @IsArray()
  @ArrayMaxSize(MAXIMUM_TAGS)
  @IsString({ each: true })
  @MaxLength(TAG_MAX_LENGTH, { each: true })
  targetClienteles?: string[];

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(4000, { message: "A memória da IA pode ter até 4000 caracteres" })
  aiMemory?: string | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @MinLength(3, { message: "O endereço precisa de pelo menos 3 caracteres" })
  @MaxLength(SLUG_MAX_LENGTH)
  @Matches(SLUG_PATTERN, {
    message: "Use só letras minúsculas, números e hífens",
  })
  slug?: string;
}
