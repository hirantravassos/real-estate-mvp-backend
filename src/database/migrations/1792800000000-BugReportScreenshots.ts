import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The print of the screen sent with a bug report, kept in the storage under
 * bug-reports/{userId}/. Checks first, so it can run again.
 */
export class BugReportScreenshots1792800000000 implements MigrationInterface {
  name = "BugReportScreenshots1792800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("bug_reports", "screenshotKey"))) {
      await queryRunner.query(
        "ALTER TABLE `bug_reports` ADD `screenshotKey` varchar(200) NULL",
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("bug_reports", "screenshotKey")) {
      await queryRunner.query(
        "ALTER TABLE `bug_reports` DROP COLUMN `screenshotKey`",
      );
    }
  }
}
