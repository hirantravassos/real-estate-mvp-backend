import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { PropertyContact } from "./property-contact.entity";
import { ColumnBoolean } from "../../../shared/decorators/columns/column-boolean.decorator";
import { ColumnCurrency } from "../../../shared/decorators/columns/column-currency.decorator";
import {
  PropertyConciergeServiceEnum,
  PropertyFurnitureEnum,
  PropertyLiftEnum,
} from "../mappers/property.mapper";
import { PropertyFile } from "./property-files.entity";

@Entity("properties")
export class Property extends BaseEntity {
  @ManyToOne(() => User, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "userId" })
  user: User;

  @OneToMany(() => PropertyContact, (contact) => contact.property, {
    cascade: ["insert", "update", "remove", "soft-remove", "recover"],
  })
  contacts: PropertyContact[];

  @OneToMany(() => PropertyFile, (contact) => contact.property)
  files: PropertyFile[];

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @Column({ type: "varchar", nullable: true })
  alias: string | null;

  @Column({ type: "text", nullable: false })
  address: string;

  @Column({ type: "varchar", nullable: false })
  address2: string;

  @Column({ type: "text", nullable: true })
  comment: string | null;

  @ColumnCurrency({ nullable: false })
  price: string;

  @Column({ type: "int", nullable: true })
  infoBedrooms: number | null;

  @Column({ type: "int", nullable: true })
  infoSuiteBedrooms: number | null;

  @Column({ type: "int", nullable: true })
  infoBathrooms: number | null;

  @Column({ type: "enum", enum: PropertyLiftEnum, nullable: true })
  infoLift: PropertyLiftEnum | null;

  @ColumnBoolean({ nullable: true })
  infoHasPool: boolean | null;

  @ColumnBoolean({ nullable: true })
  infoHasBalcony: boolean | null;

  @ColumnBoolean({ nullable: true })
  infoHasFancyBalcony: boolean | null;

  @Column({
    type: "enum",
    enum: PropertyFurnitureEnum,
    nullable: true,
  })
  infoFurniture: PropertyFurnitureEnum | null;

  @Column({ type: "int", nullable: true })
  infoParkingSpaceUnits: number | null;

  @ColumnBoolean({ nullable: true })
  infoHasDedicatedParkingSpace: boolean | null;

  @Column({ type: "numeric", nullable: true })
  infoSquareMeters: number | null;

  @ColumnCurrency({ nullable: true })
  infoPropertyTax: string | null;

  @ColumnCurrency({ nullable: true })
  infoMaintenanceFee: string | null;

  @Column({ type: "int", nullable: true })
  infoFloor: number | null;

  @Column({ type: "numeric", nullable: true })
  infoBeachProximityInKm: number | null;

  @Column({ type: "enum", enum: PropertyConciergeServiceEnum, nullable: true })
  infoConciergeService: PropertyConciergeServiceEnum | null;

  @ColumnBoolean({ nullable: true })
  infoHasAirConditioningSystem: boolean | null;

  @ColumnBoolean({ nullable: true })
  infoHasGasWaterHeatingSystem: boolean | null;

  @ColumnBoolean({ nullable: true })
  infoHasGasSystem: boolean | null;

  @ColumnBoolean({ nullable: true })
  infoHasGym: boolean | null;
}
