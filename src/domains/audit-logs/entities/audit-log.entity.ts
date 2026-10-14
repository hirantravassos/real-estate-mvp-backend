import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";

export enum AuditLogScope {
  /** A broker changing something in the app. */
  USER = "user",
  /** Anything done in, or tried against, the backoffice. */
  ADMIN = "admin",
}

export enum AuditLogOutcome {
  SUCCESS = "success",
  FAILURE = "failure",
  DENIED = "denied",
}

/**
 * Who did what, when and from where. Never the request body: only the route,
 * the id it acted on and the result. Kept for six months, like the access
 * logs, then purged.
 */
@Entity("audit_logs")
@Index(["createdAt"])
@Index(["userId", "createdAt"])
@Index(["scope", "createdAt"])
export class AuditLog extends BaseEntity {
  /** The trail outlives the account, so a deleted broker leaves it unlinked. */
  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "userId" })
  user: User | null;

  @Column({ type: "varchar", length: 36, nullable: true })
  userId: string | null;

  @Column({ type: "enum", enum: AuditLogScope, nullable: false })
  scope: AuditLogScope;

  /** Like "POST /customers/:id" or "admin.session.open". */
  @Column({ type: "varchar", length: 160, nullable: false })
  action: string;

  @Column({ type: "varchar", length: 64, nullable: true })
  resourceId: string | null;

  @Column({ type: "smallint", nullable: true })
  statusCode: number | null;

  @Column({ type: "enum", enum: AuditLogOutcome, nullable: false })
  outcome: AuditLogOutcome;

  @Column({ type: "varchar", length: 64, nullable: true })
  ip: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  userAgent: string | null;

  /** A short, scrubbed note, never a secret nor a token. */
  @Column({ type: "varchar", length: 500, nullable: true })
  detail: string | null;
}
