import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * One row per signed in device, so refresh tokens rotate on every use and
 * the session slides forward instead of ending on a fixed date. Checks
 * first, so it can run again.
 */
export class RefreshSessions1792886400000 implements MigrationInterface {
  name = "RefreshSessions1792886400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("refresh_sessions"))) {
      await queryRunner.query(
        "CREATE TABLE `refresh_sessions` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `seed` varchar(64) NOT NULL, `generation` int NOT NULL DEFAULT 0, `rotatedAt` datetime NULL, `idleExpiresAt` datetime NOT NULL, `absoluteExpiresAt` datetime NOT NULL, `tokenVersion` int NOT NULL, INDEX `IDX_refresh_sessions_userId` (`userId`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
      );
    }
    const foreignKeys = (await queryRunner.query(
      "SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'refresh_sessions' AND CONSTRAINT_NAME = 'FK_refresh_sessions_userId' AND CONSTRAINT_TYPE = 'FOREIGN KEY'",
    )) as unknown[];
    if (foreignKeys.length === 0) {
      await queryRunner.query(
        "ALTER TABLE `refresh_sessions` ADD CONSTRAINT `FK_refresh_sessions_userId` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("refresh_sessions")) {
      await queryRunner.query("DROP TABLE `refresh_sessions`");
    }
  }
}
