import { PropertyLiftEnum } from "../enums/property-lift.enum";
import { PropertyFurnitureEnum } from "../enums/property-furniture.enum";
import { PropertyConciergeServiceEnum } from "../enums/property-concierge.enum";
import {
  IsBoolean,
  IsCurrency,
  IsEnum,
  IsNumber,
  IsOptional,
} from "class-validator";

export class PropertyCreateCharacteristics {
  @IsNumber()
  @IsOptional()
  bedrooms: number | null;

  @IsNumber()
  @IsOptional()
  suiteBedrooms: number | null;

  @IsNumber()
  @IsOptional()
  bathrooms: number | null;

  @IsEnum(PropertyLiftEnum)
  @IsOptional()
  lift: PropertyLiftEnum | null;

  @IsBoolean()
  @IsOptional()
  hasPool: boolean | null;

  @IsBoolean()
  @IsOptional()
  hasBalcony: boolean | null;

  @IsBoolean()
  @IsOptional()
  hasFancyBalcony: boolean | null;

  @IsEnum(PropertyFurnitureEnum)
  @IsOptional()
  furniture: PropertyFurnitureEnum | null;

  @IsNumber()
  @IsOptional()
  parkingSpaceUnits: number | null;

  @IsBoolean()
  @IsOptional()
  hasDedicatedParkingSpace: boolean | null;

  @IsNumber()
  @IsOptional()
  squareMeters: number | null;

  @IsCurrency()
  @IsOptional()
  propertyTax: string | null;

  @IsCurrency()
  @IsOptional()
  maintenanceFee: string | null;

  @IsNumber()
  @IsOptional()
  floor: number | null;

  @IsEnum(PropertyConciergeServiceEnum)
  @IsOptional()
  beachProximityInKm: number | null;

  @IsEnum(PropertyConciergeServiceEnum)
  @IsOptional()
  conciergeService: PropertyConciergeServiceEnum | null;

  @IsBoolean()
  @IsOptional()
  hasAirConditioningSystem: boolean | null;

  @IsBoolean()
  @IsOptional()
  hasGasWaterHeatingSystem: boolean | null;

  @IsBoolean()
  @IsOptional()
  hasGasSystem: boolean | null;

  @IsBoolean()
  @IsOptional()
  hasGym: boolean | null;
}
