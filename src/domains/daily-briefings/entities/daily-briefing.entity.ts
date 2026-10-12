import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import {
  DailyBriefingStatus,
  DailyBriefingOrigin,
} from "../enums/daily-briefing.enum";

/**
 * A customer or WhatsApp contact the AI talked about, as they were when it
 * wrote. Contacts not saved as customers only have the conversation.
 */
export interface DailyBriefingCustomer {
  id: string | null;
  name: string;
  phone: string | null;
  conversationId: string | null;
}

export interface DailyBriefingAttendance {
  title: string;
  detail: string;
  customer: DailyBriefingCustomer | null;
  /** A WhatsApp message ready to send, when one helps. */
  message: string | null;
}

export interface DailyBriefingRecovery {
  reason: string;
  customer: DailyBriefingCustomer;
  message: string;
}

export interface DailyBriefingImprovement {
  title: string;
  detail: string;
}

export interface DailyBriefingContent {
  headline: string;
  summary: string;
  attendances: DailyBriefingAttendance[];
  recoveries: DailyBriefingRecovery[];
  improvements: DailyBriefingImprovement[];
}

/** The AI's look over the broker's base, written once a morning. */
@Entity("daily_briefings")
@Index(["userId", "createdAt"])
@Index(["userId", "freeDay"], { unique: true })
export class DailyBriefing extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  /** Day in Brasília it belongs to, like "2026-10-12". */
  @Column({ type: "varchar", length: 10, nullable: false })
  day: string;

  /**
   * Same as the day on the free one, null on the paid ones. The unique
   * index keeps a single free briefing a day, even with two servers.
   */
  @Column({ type: "varchar", length: 10, nullable: true })
  freeDay: string | null;

  @Column({ type: "enum", enum: DailyBriefingOrigin, nullable: false })
  origin: DailyBriefingOrigin;

  @Column({
    type: "enum",
    enum: DailyBriefingStatus,
    nullable: false,
    default: DailyBriefingStatus.GENERATING,
  })
  status: DailyBriefingStatus;

  @Column({ type: "json", nullable: true })
  content: DailyBriefingContent | null;

  @Column({ type: "int", nullable: false, default: 0 })
  creditsCharged: number;

  @Column({ type: "datetime", nullable: true })
  generatedAt: Date | null;
}
