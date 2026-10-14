import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { Customer } from "../../customers/entities/customer.entity";
import { User } from "../../users/entities/user.entity";
import {
  PortalKey,
  PortalProgressStatus,
  PropertyHuntOrigin,
  PropertyHuntStatus,
} from "../enums/property-hunt.enum";
import type { HuntCriteria } from "../types/hunt-criteria.type";

export interface PortalProgress {
  portal: PortalKey;
  status: PortalProgressStatus;
  /** True when the portal was browsed signed in. */
  authenticated: boolean;
  found: number;
  analyzed: number;
  /** Read in a recent hunt of the same broker, reused without credits. */
  reused?: number;
  matched: number;
  message: string | null;
}

/** One search ordered by the broker, across the portals and their own catalog. */
@Entity("property_hunts")
@Index(["userId", "createdAt"])
export class PropertyHunt extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @ManyToOne(() => Customer, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "customerId" })
  customer: Customer | null;

  @Column({ type: "varchar", nullable: true })
  customerId: string | null;

  @Column({ type: "varchar", nullable: true })
  conversationId: string | null;

  @Column({ type: "enum", enum: PropertyHuntOrigin, nullable: false })
  origin: PropertyHuntOrigin;

  /** What the broker asked, in their own words. */
  @Column({ type: "text", nullable: false })
  request: string;

  /** One line the AI wrote describing the search. */
  @Column({ type: "varchar", length: 255, nullable: true })
  headline: string | null;

  /** The customer profile the AI read from the conversation. */
  @Column({ type: "text", nullable: true })
  summary: string | null;

  @Column({ type: "json", nullable: false })
  criteria: HuntCriteria;

  @Column({ type: "json", nullable: false })
  portals: PortalKey[];

  @Column({ type: "boolean", nullable: false, default: true })
  includeCatalog: boolean;

  @Column({
    type: "enum",
    enum: PropertyHuntStatus,
    nullable: false,
    default: PropertyHuntStatus.QUEUED,
  })
  status: PropertyHuntStatus;

  @Column({ type: "json", nullable: false })
  progress: PortalProgress[];

  @Column({ type: "int", nullable: false, default: 0 })
  catalogMatches: number;

  @Column({ type: "int", nullable: false, default: 0 })
  portalMatches: number;

  @Column({ type: "int", nullable: false, default: 0 })
  creditsCharged: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  errorMessage: string | null;

  @Column({ type: "datetime", nullable: true })
  startedAt: Date | null;

  @Column({ type: "datetime", nullable: true })
  finishedAt: Date | null;
}
