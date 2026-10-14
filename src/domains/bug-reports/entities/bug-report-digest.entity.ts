import { CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

/**
 * One row per day the admin digest went out. The primary key is the claim:
 * with two servers only the one whose insert lands sends the mail.
 */
@Entity("bug_report_digests")
export class BugReportDigest {
  /** Calendar day in Brasília, like "2026-10-14". */
  @PrimaryColumn({ type: "varchar", length: 10 })
  day: string;

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  readonly createdAt!: Date;
}
