import { PropertyFurnitureEnum } from "../enums/property-furniture.enum";
import { PropertyConciergeServiceEnum } from "../enums/property-concierge.enum";
import { PropertyContactDto } from "./property-contact.dto";
import { PropertyLiftEnum } from "../enums/property-lift.enum";

export interface PropertyDto {
  id: string;
  alias: string | null;
  address: string;
  address2: string;
  comment: string | null;
  price: string;
  contacts: PropertyContactDto[];
  infoBedrooms: number | null;
  infoSuiteBedrooms: number | null;
  infoBathrooms: number | null;
  infoLift: PropertyLiftEnum | null;
  infoHasPool: boolean | null;
  infoHasBalcony: boolean | null;
  infoHasFancyBalcony: boolean | null;
  infoFurniture: PropertyFurnitureEnum | null;
  infoParkingSpaceUnits: number | null;
  infoHasDedicatedParkingSpace: boolean | null;
  infoSquareMeters: number | null;
  infoPropertyTax: string | null;
  infoMaintenanceFee: string | null;
  infoFloor: number | null;
  infoBeachProximityInKm: number | null;
  infoConciergeService: PropertyConciergeServiceEnum | null;
  infoHasAirConditioningSystem: boolean | null;
  infoHasGasWaterHeatingSystem: boolean | null;
  infoHasGasSystem: boolean | null;
  infoHasGym: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  active: boolean;
}
