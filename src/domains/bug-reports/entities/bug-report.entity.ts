import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import {
  BugReportSeverity,
  BugReportSource,
  BugReportStatus,
} from "../enums/bug-report.enum";
import type { BugReportTelemetry } from "../helpers/bug-report-telemetry.helper";

/**
 * A problem a broker reported from inside the app, with the telemetry the
 * browser had at that moment: page, device, recent errors, recent API calls
 * and what the broker clicked. Only the backoffice reads it.
 */
@Entity("bug_reports")
@Index(["status", "createdAt"])
@Index(["userId", "createdAt"])
export class BugReport extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", length: 36, nullable: false })
  userId: string;

  @Column({ type: "enum", enum: BugReportSource, nullable: false })
  source: BugReportSource;

  @Column({ type: "enum", enum: BugReportSeverity, nullable: false })
  severity: BugReportSeverity;

  @Column({
    type: "enum",
    enum: BugReportStatus,
    nullable: false,
    default: BugReportStatus.OPEN,
  })
  status: BugReportStatus;

  /** What the broker typed, empty on a panic. */
  @Column({ type: "text", nullable: true })
  description: string | null;

  /** The broker said it stops their work. */
  @Column({ type: "boolean", nullable: false, default: false })
  blocking: boolean;

  /** Path of the page, never the query string. */
  @Column({ type: "varchar", length: 500, nullable: true })
  pagePath: string | null;

  /** Build of the app that sent it, like a commit sha. */
  @Column({ type: "varchar", length: 64, nullable: true })
  appVersion: string | null;

  /** The latest error the browser caught, for the list and the grouping. */
  @Column({ type: "varchar", length: 500, nullable: true })
  errorMessage: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  ip: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  userAgent: string | null;

  /** Sanitized on the way in, see sanitizeBugReportTelemetry. */
  @Column({ type: "json", nullable: true })
  telemetry: BugReportTelemetry | null;

  /** What the backoffice did about it. */
  @Column({ type: "varchar", length: 2000, nullable: true })
  resolutionNote: string | null;

  @Column({ type: "datetime", nullable: true })
  resolvedAt: Date | null;
}
