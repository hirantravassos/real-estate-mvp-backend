import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { PortalKey } from "../enums/property-hunt.enum";
import type { ListingSnapshot } from "../types/hunt-criteria.type";

/**
 * A public portal listing the AI already read for this broker, fit or not.
 * The next hunts reuse it instead of opening the page and paying the AI
 * again. Private to the broker, never shown outside the app, and dropped
 * after a few days, see LISTING_REUSE_DAYS.
 */
@Entity("hunted_listings")
@Index(["userId", "urlHash"], { unique: true })
@Index(["userId", "analyzedAt"])
export class HuntedListing extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @Column({ type: "enum", enum: PortalKey, nullable: false })
  portal: PortalKey;

  @Column({ type: "varchar", length: 1024, nullable: false })
  url: string;

  /** SHA-256 of the url, the url itself is too long for a unique index. */
  @Column({ type: "char", length: 64, nullable: false })
  urlHash: string;

  /** False when the page was not a single listing (removed, list, error). */
  @Column({ type: "boolean", nullable: false })
  isListing: boolean;

  @Column({ type: "varchar", length: 255, nullable: false })
  title: string;

  @Column({ type: "json", nullable: true })
  snapshot: ListingSnapshot | null;

  @Column({ type: "datetime", nullable: false })
  analyzedAt: Date;
}
