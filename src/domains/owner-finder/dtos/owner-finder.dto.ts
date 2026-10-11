import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { ValidateBrazilianPhoneNumber } from "../../../shared/decorators/validation/brazilian-phone-number.decorator";
import { PropertyKindEnum } from "../../properties/mappers/property.mapper";

export const MATCH_CONFIDENCES = ["high", "medium", "low"] as const;
export type MatchConfidence = (typeof MATCH_CONFIDENCES)[number];

/**
 * The property whose owner is searched. A registered property is read from
 * the database; without one, the broker describes it to check the owner
 * before registering it.
 */
export class OwnerContactSearchDto {
  @IsOptional()
  @IsUUID()
  propertyId?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  address?: string | null;

  /** Apartment, block or building name. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  complement?: string | null;

  @IsOptional()
  @IsEnum(PropertyKindEnum)
  kind?: PropertyKindEnum | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  bedrooms?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  squareMeters?: number | null;

  /** Anything else that tells this property apart, like the listing link. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  details?: string | null;
}

export class OwnerContactSaveDto {
  @IsUUID()
  propertyId: string;

  @ValidateBrazilianPhoneNumber()
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string | null;

  @IsUrl({ require_protocol: true })
  @MaxLength(1000)
  sourceUrl: string;

  @IsString()
  @MaxLength(80)
  sourceName: string;
}
