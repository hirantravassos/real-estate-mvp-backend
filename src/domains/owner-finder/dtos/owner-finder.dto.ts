import { Type } from "class-transformer";
import {
  IsEnum,
  IsIn,
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
import { ValidateCurrency } from "../../../shared/decorators/validation/currency.decorator";
import { PropertyKindEnum } from "../../properties/mappers/property.mapper";

export const OWNER_SEARCH_PURPOSES = ["sale", "rent"] as const;
export type OwnerSearchPurpose = (typeof OWNER_SEARCH_PURPOSES)[number];

export const ADVERTISER_TYPES = ["owner", "agency", "unknown"] as const;
export type AdvertiserType = (typeof ADVERTISER_TYPES)[number];

export class OwnerSearchDto {
  /** Neighborhood, city and state, or the full address. */
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  location: string;

  @IsOptional()
  @IsIn(OWNER_SEARCH_PURPOSES)
  purpose?: OwnerSearchPurpose;

  @IsOptional()
  @IsEnum(PropertyKindEnum)
  kind?: PropertyKindEnum | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  bedrooms?: number | null;

  /** In whole reais, like every price in the app. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maximumPrice?: number | null;

  /** Anything else that helps, like the building name. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  details?: string | null;

  /** The property being searched for, kept in the credit history. */
  @IsOptional()
  @IsUUID()
  propertyId?: string | null;
}

export class OwnerLeadSaveDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsUrl({ require_protocol: true })
  @MaxLength(1000)
  url: string;

  @IsString()
  @MaxLength(80)
  source: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  advertiserName?: string | null;

  @ValidateBrazilianPhoneNumber({ isOptional: true })
  phone?: string | null;

  @IsOptional()
  @ValidateCurrency({ isOptional: true })
  price?: number | null;

  @IsOptional()
  @IsEnum(PropertyKindEnum)
  kind?: PropertyKindEnum | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  bedrooms?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  squareMeters?: number | null;

  /** Adds the contact to this property instead of creating a new one. */
  @IsOptional()
  @IsUUID()
  propertyId?: string | null;
}
