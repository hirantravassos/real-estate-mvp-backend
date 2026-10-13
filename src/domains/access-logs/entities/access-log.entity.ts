import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";

export enum AccessLogEvent {
  LOGIN = "login",
  REFRESH = "refresh",
  LOGOUT = "logout",
}

/**
 * Date, time and IP of each access to the app, kept for six months as the
 * Marco Civil da Internet (art. 15) asks, then purged.
 */
@Entity("access_logs")
@Index(["createdAt"])
@Index(["userId", "createdAt"])
export class AccessLog extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @Column({ type: "enum", enum: AccessLogEvent, nullable: false })
  event: AccessLogEvent;

  @Column({ type: "varchar", length: 64, nullable: true })
  ip: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  userAgent: string | null;
}
