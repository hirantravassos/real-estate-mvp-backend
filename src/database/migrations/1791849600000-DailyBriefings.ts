import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The AI's morning briefing of each broker: one free a day, kept unique by
 * `userId` + `freeDay`, and the paid extra ones. Every step checks first,
 * so it can run again.
 */
export class DailyBriefings1791849600000 implements MigrationInterface {
  name = "DailyBriefings1791849600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("daily_briefings"))) {
      await queryRunner.query(
        "CREATE TABLE `daily_briefings` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `day` varchar(10) NOT NULL, `freeDay` varchar(10) NULL, `origin` enum ('scheduled', 'manual', 'paid') NOT NULL, `status` enum ('generating', 'ready') NOT NULL DEFAULT 'generating', `content` json NULL, `creditsCharged` int NOT NULL DEFAULT '0', `generatedAt` datetime NULL, INDEX `IDX_086eab8021afabbcb866715a1c` (`userId`, `created_at`), UNIQUE INDEX `IDX_5b9b4d9cfebe6c5e5f009f40d5` (`userId`, `freeDay`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
      );
    }

    const foreignKeys = (await queryRunner.query(
      "SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'daily_briefings' AND CONSTRAINT_NAME = 'FK_75094775569112cdf5de1bb9c16' AND CONSTRAINT_TYPE = 'FOREIGN KEY'",
    )) as unknown[];
    if (foreignKeys.length === 0) {
      await queryRunner.query(
        "ALTER TABLE `daily_briefings` ADD CONSTRAINT `FK_75094775569112cdf5de1bb9c16` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("daily_briefings")) {
      await queryRunner.query("DROP TABLE `daily_briefings`");
    }
  }
}
