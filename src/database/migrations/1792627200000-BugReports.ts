import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Problems reported from inside the app, with the sanitized telemetry of the
 * browser, plus one row per day the admin digest went out (the claim that
 * keeps two servers from mailing twice). Every step checks first, so it can
 * run again.
 */
export class BugReports1792627200000 implements MigrationInterface {
  name = "BugReports1792627200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("bug_reports"))) {
      await queryRunner.query(
        "CREATE TABLE `bug_reports` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(36) NOT NULL, `source` enum ('button', 'shake', 'panic', 'error_boundary') NOT NULL, `severity` enum ('normal', 'high', 'critical') NOT NULL, `status` enum ('open', 'in_progress', 'resolved', 'dismissed') NOT NULL DEFAULT 'open', `description` text NULL, `blocking` tinyint NOT NULL DEFAULT 0, `pagePath` varchar(500) NULL, `appVersion` varchar(64) NULL, `errorMessage` varchar(500) NULL, `ip` varchar(64) NULL, `userAgent` varchar(500) NULL, `telemetry` json NULL, `resolutionNote` varchar(2000) NULL, `resolvedAt` datetime NULL, INDEX `IDX_b3c66da2c84ee9e21cfc7228d3` (`status`, `created_at`), INDEX `IDX_dda8c176fe088787250ec1fb96` (`userId`, `created_at`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
      );
    }
    const foreignKeys = (await queryRunner.query(
      "SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'bug_reports' AND CONSTRAINT_NAME = 'FK_c3608c66301f63f9b03c208f00b' AND CONSTRAINT_TYPE = 'FOREIGN KEY'",
    )) as unknown[];
    if (foreignKeys.length === 0) {
      await queryRunner.query(
        "ALTER TABLE `bug_reports` ADD CONSTRAINT `FK_c3608c66301f63f9b03c208f00b` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
      );
    }

    if (!(await queryRunner.hasTable("bug_report_digests"))) {
      await queryRunner.query(
        "CREATE TABLE `bug_report_digests` (`day` varchar(10) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (`day`)) ENGINE=InnoDB",
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("bug_report_digests")) {
      await queryRunner.query("DROP TABLE `bug_report_digests`");
    }
    if (await queryRunner.hasTable("bug_reports")) {
      await queryRunner.query("DROP TABLE `bug_reports`");
    }
  }
}
