import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ValidateCurrency } from "../../../shared/decorators/validation/currency.decorator";
import { ValidateLongText } from "../../../shared/decorators/validation/long-text.decorator";
import { PropertyLiftEnum } from "../enums/property-lift.enum";
import { PropertyFurnitureEnum } from "../enums/property-furniture.enum";
import { PropertyConciergeServiceEnum } from "../enums/property-concierge.enum";
import { PropertyContactCreateDto } from "./property-contact-create.dto";

export class PropertyCreateDto {
  @IsOptional()
  @IsString()
  alias?: string | null;

  @IsString()
  address: string;

  @IsString()
  address2: string;

  @IsOptional()
  @ValidateLongText({ isOptional: true })
  comment?: string | null;

  @ValidateCurrency()
  price: string;

  @IsOptional()
  ownerId?: string | null;

  @IsOptional()
  @IsNumber()
  infoBedrooms?: number | null;

  @IsOptional()
  @IsNumber()
  infoSuiteBedrooms?: number | null;

  @IsOptional()
  @IsNumber()
  infoBathrooms?: number | null;

  @IsOptional()
  @IsEnum(PropertyLiftEnum)
  infoLift?: PropertyLiftEnum | null;

  @IsOptional()
  @IsBoolean()
  infoHasPool?: boolean | null;

  @IsOptional()
  @IsBoolean()
  infoHasBalcony?: boolean | null;

  @IsOptional()
  @IsBoolean()
  infoHasFancyBalcony?: boolean | null;

  @IsOptional()
  @IsEnum(PropertyFurnitureEnum)
  infoFurniture?: PropertyFurnitureEnum | null;

  @IsOptional()
  @IsNumber()
  infoParkingSpaceUnits?: number | null;

  @IsOptional()
  @IsBoolean()
  infoHasDedicatedParkingSpace?: boolean | null;

  @IsOptional()
  @IsNumber()
  infoSquareMeters?: number | null;

  @IsOptional()
  @ValidateCurrency({ isOptional: true })
  infoPropertyTax?: string | null;

  @IsOptional()
  @ValidateCurrency({ isOptional: true })
  infoMaintenanceFee?: string | null;

  @IsOptional()
  @IsNumber()
  infoFloor?: number | null;

  @IsOptional()
  @IsNumber()
  infoBeachProximityInKm?: number | null;

  @IsOptional()
  @IsString()
  infoConciergeService?: PropertyConciergeServiceEnum | null;

  @IsOptional()
  @IsBoolean()
  infoHasAirConditioningSystem?: boolean | null;

  @IsOptional()
  @IsBoolean()
  infoHasGasWaterHeatingSystem?: boolean | null;

  @IsOptional()
  @IsBoolean()
  infoHasGasSystem?: boolean | null;

  @IsOptional()
  @IsBoolean()
  infoHasGym?: boolean | null;
}
