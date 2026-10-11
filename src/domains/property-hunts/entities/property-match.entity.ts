import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { ColumnCurrency } from "../../../shared/decorators/columns/column-currency.decorator";
import { Customer } from "../../customers/entities/customer.entity";
import { Property } from "../../properties/entities/property.entity";
import { User } from "../../users/entities/user.entity";
import {
  PortalKey,
  PropertyMatchOrigin,
  PropertyMatchStatus,
} from "../enums/property-hunt.enum";
import type { ListingSnapshot } from "../types/hunt-criteria.type";
import { PropertyHunt } from "./property-hunt.entity";

/**
 * A property that fits a hunt, found on a portal or in the broker's own
 * catalog. With a customer it is a soft link: a suggestion kept on the
 * customer's file, seen only by the broker, that never changes the property.
 */
@Entity("property_matches")
@Index(["userId", "customerId", "status"])
@Index(["huntId", "score"])
export class PropertyMatch extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @ManyToOne(() => PropertyHunt, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "huntId" })
  hunt: PropertyHunt | null;

  @Column({ type: "varchar", nullable: true })
  huntId: string | null;

  @ManyToOne(() => Customer, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "customerId" })
  customer: Customer | null;

  @Column({ type: "varchar", nullable: true })
  customerId: string | null;

  /** The catalog property, or the one created when the listing was saved. */
  @ManyToOne(() => Property, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "propertyId" })
  property: Property | null;

  @Column({ type: "varchar", nullable: true })
  propertyId: string | null;

  @Column({ type: "enum", enum: PropertyMatchOrigin, nullable: false })
  origin: PropertyMatchOrigin;

  @Column({ type: "enum", enum: PortalKey, nullable: true })
  portal: PortalKey | null;

  @Column({ type: "varchar", length: 1024, nullable: true })
  externalUrl: string | null;

  @Column({ type: "varchar", length: 255, nullable: false })
  title: string;

  @Column({ type: "json", nullable: true })
  listing: ListingSnapshot | null;

  @Column({ type: "varchar", length: 1024, nullable: true })
  coverImageUrl: string | null;

  @ColumnCurrency({ nullable: true })
  price: string | null;

  /** How well it fits, from 0 to 100. */
  @Column({ type: "int", nullable: false, default: 0 })
  score: number;

  @Column({ type: "json", nullable: false })
  highlights: string[];

  @Column({ type: "json", nullable: false })
  warnings: string[];

  @Column({
    type: "enum",
    enum: PropertyMatchStatus,
    nullable: false,
    default: PropertyMatchStatus.NEW,
  })
  status: PropertyMatchStatus;

  /** Private note of the broker about this suggestion. */
  @Column({ type: "text", nullable: true })
  note: string | null;
}
