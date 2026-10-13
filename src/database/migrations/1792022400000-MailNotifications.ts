import { MigrationInterface, QueryRunner } from "typeorm";

const REMINDER_COLUMNS = [
  "trialReminderSentAt",
  "renewalReminderSentFor",
  "erasureWarningSentFor",
];

/**
 * Marks of the reminder mails already sent, so the trial ending, the Pix
 * renewal and the erasure warning reach the broker once. Checks first, so it
 * can run again.
 */
export class MailNotifications1792022400000 implements MigrationInterface {
  name = "MailNotifications1792022400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const column of REMINDER_COLUMNS) {
      if (!(await queryRunner.hasColumn("subscriptions", column))) {
        await queryRunner.query(
          `ALTER TABLE \`subscriptions\` ADD \`${column}\` datetime NULL`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const column of [...REMINDER_COLUMNS].reverse()) {
      if (await queryRunner.hasColumn("subscriptions", column)) {
        await queryRunner.query(
          `ALTER TABLE \`subscriptions\` DROP COLUMN \`${column}\``,
        );
      }
    }
  }
}
