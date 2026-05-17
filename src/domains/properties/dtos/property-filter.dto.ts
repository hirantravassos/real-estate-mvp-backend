import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";
import { ValidateBoolean } from "../../../shared/decorators/validation/boolean.decorator";
import { PropertyLiftEnum } from "../enums/property-lift.enum";
import { PropertyFurnitureEnum } from "../enums/property-furniture.enum";
import { PropertyConciergeServiceEnum } from "../enums/property-concierge.enum";

export class PropertyFilterDto extends PaginationRequestDto {
  @IsOptional() @IsString() search?: string | null;
  @IsOptional() @IsString() minPrice?: string | null;
  @IsOptional() @IsString() maxPrice?: string | null;
  @IsOptional() @IsString() minPropertyTax?: string | null;
  @IsOptional() @IsString() maxPropertyTax?: string | null;
  @IsOptional() @IsString() minMaintenanceFee?: string | null;
  @IsOptional() @IsString() maxMaintenanceFee?: string | null;
  @IsOptional() @Type(() => Number) @IsNumber() minBedrooms?: number | null;
  @IsOptional() @Type(() => Number) @IsNumber() minSuiteBedrooms?:
    | number
    | null;
  @IsOptional() @Type(() => Number) @IsNumber() minBathrooms?: number | null;
  @IsOptional() @Type(() => Number) @IsNumber() minSquareMeters?: number | null;
  @IsOptional() @Type(() => Number) @IsNumber() maxSquareMeters?: number | null;
  @IsOptional() @Type(() => Number) @IsNumber() minParkingSlots?: number | null;
  @IsOptional() @Type(() => Number) @IsNumber() minFloor?: number | null;
  @IsOptional() @Type(() => Number) @IsNumber() maxFloor?: number | null;
  @IsOptional() @Type(() => Number) @IsNumber() maxBeachProximityInKm?:
    | number
    | null;
  @IsOptional() @IsEnum(PropertyLiftEnum) infoLift?: PropertyLiftEnum | null;
  @IsOptional()
  @IsEnum(PropertyFurnitureEnum)
  infoFurniture?: PropertyFurnitureEnum | null;
  @IsOptional()
  @IsEnum(PropertyConciergeServiceEnum)
  infoConciergeService?: PropertyConciergeServiceEnum | null;
  @ValidateBoolean() hasPool?: boolean | null;
  @ValidateBoolean() hasBalcony?: boolean | null;
  @ValidateBoolean() hasFancyBalcony?: boolean | null;
  @ValidateBoolean() hasDedicatedParkingSpace?: boolean | null;
  @ValidateBoolean() hasAirConditioningSystem?: boolean | null;
  @ValidateBoolean() hasGasWaterHeatingSystem?: boolean | null;
  @ValidateBoolean() hasGasSystem?: boolean | null;
  @ValidateBoolean() hasGym?: boolean | null;
}
