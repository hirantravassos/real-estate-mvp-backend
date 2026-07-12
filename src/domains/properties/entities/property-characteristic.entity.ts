import { Column } from "typeorm";
import { PropertyLiftEnum } from "../enums/property-lift.enum";
import { ColumnBoolean } from "../../../shared/decorators/columns/column-boolean.decorator";
import { PropertyFurnitureEnum } from "../enums/property-furniture.enum";
import { ColumnCurrency } from "../../../shared/decorators/columns/column-currency.decorator";
import { PropertyConciergeServiceEnum } from "../enums/property-concierge.enum";

export class PropertyCharacteristic {
  @Column({ type: "int", nullable: true })
  bedrooms: number | null;

  @Column({ type: "int", nullable: true })
  suiteBedrooms: number | null;

  @Column({ type: "int", nullable: true })
  bathrooms: number | null;

  @Column({ type: "enum", enum: PropertyLiftEnum, nullable: true })
  lift: PropertyLiftEnum | null;

  @ColumnBoolean({ nullable: true })
  hasPool: boolean | null;

  @ColumnBoolean({ nullable: true })
  hasBalcony: boolean | null;

  @ColumnBoolean({ nullable: true })
  hasFancyBalcony: boolean | null;

  @Column({
    type: "enum",
    enum: PropertyFurnitureEnum,
    nullable: true,
  })
  furniture: PropertyFurnitureEnum | null;

  @Column({ type: "int", nullable: true })
  parkingSpaceUnits: number | null;

  @ColumnBoolean({ nullable: true })
  hasDedicatedParkingSpace: boolean | null;

  @Column({ type: "numeric", nullable: true })
  squareMeters: number | null;

  @ColumnCurrency({ nullable: true })
  propertyTax: string | null;

  @ColumnCurrency({ nullable: true })
  maintenanceFee: string | null;

  @Column({ type: "int", nullable: true })
  floor: number | null;

  @Column({ type: "numeric", nullable: true })
  beachProximityInKm: number | null;

  @Column({ type: "enum", enum: PropertyConciergeServiceEnum, nullable: true })
  conciergeService: PropertyConciergeServiceEnum | null;

  @ColumnBoolean({ nullable: true })
  hasAirConditioningSystem: boolean | null;

  @ColumnBoolean({ nullable: true })
  hasGasWaterHeatingSystem: boolean | null;

  @ColumnBoolean({ nullable: true })
  hasGasSystem: boolean | null;

  @ColumnBoolean({ nullable: true })
  hasGym: boolean | null;
}
