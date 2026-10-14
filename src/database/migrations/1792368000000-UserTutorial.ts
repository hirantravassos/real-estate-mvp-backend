import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * When the broker finished or skipped the welcome tour. Null shows the tour on
 * the next visit, so every account, old ones too, sees it once.
 */
export class UserTutorial1792368000000 implements MigrationInterface {
  name = "UserTutorial1792368000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("users", "tutorialCompletedAt"))) {
      await queryRunner.query(
        "ALTER TABLE `users` ADD `tutorialCompletedAt` datetime NULL",
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("users", "tutorialCompletedAt")) {
      await queryRunner.query(
        "ALTER TABLE `users` DROP COLUMN `tutorialCompletedAt`",
      );
    }
  }
}
