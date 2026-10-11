import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { PortalAccountStatus, PortalKey } from "../enums/property-hunt.enum";

/**
 * A login on a listing portal. The browser signs in once and keeps the
 * session, so the hunts never stop at the login page. Without a user it is
 * a platform account, shared by every broker who has none of their own.
 */
@Entity("portal_accounts")
@Index(["userId", "portal"])
export class PortalAccount extends BaseEntity {
  @ManyToOne(() => User, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User | null;

  @Column({ type: "varchar", nullable: true })
  userId: string | null;

  @Column({ type: "enum", enum: PortalKey, nullable: false })
  portal: PortalKey;

  @Column({ type: "varchar", length: 255, nullable: false })
  login: string;

  /** Encrypted, never sent back to the app. */
  @Column({ type: "text", nullable: true, select: false })
  passwordCipher: string | null;

  /** Encrypted browser cookies of the signed in session. */
  @Column({ type: "longtext", nullable: true, select: false })
  sessionCipher: string | null;

  @Column({
    type: "enum",
    enum: PortalAccountStatus,
    nullable: false,
    default: PortalAccountStatus.UNCHECKED,
  })
  status: PortalAccountStatus;

  @Column({ type: "varchar", length: 255, nullable: true })
  statusMessage: string | null;

  @Column({ type: "datetime", nullable: true })
  connectedAt: Date | null;

  @Column({ type: "datetime", nullable: true })
  lastUsedAt: Date | null;
}
