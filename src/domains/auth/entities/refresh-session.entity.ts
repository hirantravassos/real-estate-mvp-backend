import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";

/**
 * One signed in device. Its refresh token is derived from the seed and the
 * generation, so every refresh rotates it and an older token presented again
 * reveals a copy. `active` false means the session was revoked.
 */
@Entity("refresh_sessions")
@Index("IDX_refresh_sessions_userId", ["userId"])
export class RefreshSession extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({
    name: "userId",
    foreignKeyConstraintName: "FK_refresh_sessions_userId",
  })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  /** Random, never leaves the server, signs each generation of the token. */
  @Column({ type: "varchar", length: 64, nullable: false })
  seed: string;

  /** Goes up on every refresh, only the current one rotates. */
  @Column({ type: "int", nullable: false, default: 0 })
  generation: number;

  /** When the current generation was issued, null before the first refresh. */
  @Column({ type: "datetime", nullable: true })
  rotatedAt: Date | null;

  /** Moves forward on every refresh, a device left unused this long signs in again. */
  @Column({ type: "datetime", nullable: false })
  idleExpiresAt: Date;

  /** Never moves, caps how long a device stays signed in. */
  @Column({ type: "datetime", nullable: false })
  absoluteExpiresAt: Date;

  /** The user's token version when the session opened, a logout outdates it. */
  @Column({ type: "int", nullable: false })
  tokenVersion: number;
}
