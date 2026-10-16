import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { ColumnCurrency } from "../../../shared/decorators/columns/column-currency.decorator";
import { PropertyKindEnum } from "../../properties/mappers/property.mapper";
import { User } from "../../users/entities/user.entity";
import { PortalKey } from "../enums/property-hunt.enum";

/**
 * A portal listing kept at hand by the broker: only the link and a small
 * card (features, neighborhood and city, a short description). It is not a
 * property of the catalog, it never reaches a public page, and it is kept
 * until the broker erases it or the account is erased.
 */
@Entity("listing_shortcuts")
@Index(["userId", "createdAt"])
export class ListingShortcut extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  /** The hunt suggestion it came from, when there is one. */
  @Column({ type: "varchar", length: 36, nullable: true })
  matchId: string | null;

  @Column({ type: "enum", enum: PortalKey, nullable: false })
  portal: PortalKey;

  @Column({ type: "varchar", length: 1024, nullable: false })
  externalUrl: string;

  @Column({ type: "varchar", length: 255, nullable: false })
  title: string;

  @Column({ type: "enum", enum: PropertyKindEnum, nullable: true })
  kind: PropertyKindEnum | null;

  /** "sale" or "rent". */
  @Column({ type: "varchar", length: 10, nullable: true })
  transaction: string | null;

  @ColumnCurrency({ nullable: true })
  price: string | null;

  @Column({ type: "int", nullable: true })
  bedrooms: number | null;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  area: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  neighborhood: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  city: string | null;

  @Column({ type: "varchar", length: 2, nullable: true })
  state: string | null;

  @Column({ type: "varchar", length: 400, nullable: true })
  summary: string | null;
}
