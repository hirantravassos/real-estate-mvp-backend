import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { PropertyKindEnum } from "../../properties/mappers/property.mapper";
import { PortalKey, PropertyMatchStatus } from "../enums/property-hunt.enum";
import { HUNT_AMENITIES, HUNT_TRANSACTIONS } from "../types/hunt-criteria.type";
import type {
  HuntAmenity,
  HuntCriteria,
  HuntTransaction,
} from "../types/hunt-criteria.type";

const trimmed = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class HuntInterpretDto {
  @Transform(trimmed)
  @IsString()
  @Length(3, 1500, { message: "Descreva o imóvel em até 1500 letras." })
  request: string;
}

export class HuntCriteriaDto implements HuntCriteria {
  @IsIn(HUNT_TRANSACTIONS)
  transaction: HuntTransaction;

  @IsOptional()
  @IsEnum(PropertyKindEnum)
  kind: PropertyKindEnum | null;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  state: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city: string | null;

  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  neighborhoods: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumPrice: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumPrice: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  minimumBedrooms: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  minimumSuites: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  minimumBathrooms: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  minimumParkingSpaces: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumArea: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumArea: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumMaintenanceFee: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumBeachDistanceMeters: number | null;

  @IsArray()
  @IsIn(HUNT_AMENITIES, { each: true })
  amenities: HuntAmenity[];

  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  extraWishes: string[];
}

export class PropertyHuntCreateDto {
  @Transform(trimmed)
  @IsString()
  @Length(3, 1500)
  request: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  headline?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  summary?: string | null;

  @ValidateNested()
  @Type(() => HuntCriteriaDto)
  criteria: HuntCriteriaDto;

  @IsArray()
  @IsEnum(PortalKey, { each: true })
  portals: PortalKey[];

  @IsBoolean()
  includeCatalog: boolean;

  @IsOptional()
  @IsUUID()
  customerId?: string | null;

  @IsOptional()
  @IsUUID()
  conversationId?: string | null;

  /** Keeps the conversation summary as a note on the customer's file. */
  @IsOptional()
  @IsBoolean()
  saveSummaryAsNote?: boolean;
}

const parseBoolean = ({ value }: { value: unknown }) =>
  value === undefined || value === null || value === ""
    ? undefined
    : value === true || value === "true";

export class PropertyHuntFilterDto extends PaginationRequestDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;
}

export class PropertyMatchFilterDto extends PaginationRequestDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  huntId?: string;

  @IsOptional()
  @IsEnum(PropertyMatchStatus)
  status?: PropertyMatchStatus;

  @IsOptional()
  @Transform(parseBoolean)
  @IsBoolean()
  includeDiscarded?: boolean;
}

export class PropertyMatchUpdateDto {
  @IsOptional()
  @IsEnum(PropertyMatchStatus)
  status?: PropertyMatchStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string | null;

  /** Null unlinks the suggestion from the customer. */
  @IsOptional()
  @IsUUID()
  customerId?: string | null;
}

export class PropertyMatchPinDto {
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @IsUUID()
  @IsNotEmpty()
  propertyId: string;
}

export class ListingShortcutCreateDto {
  @IsUUID()
  @IsNotEmpty()
  matchId: string;
}
