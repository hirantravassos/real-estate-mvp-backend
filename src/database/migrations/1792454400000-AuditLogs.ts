import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The audit trail: every change a broker makes and every backoffice call or
 * attempt, with the route, the result, the IP and the browser. Never the
 * request body. A deleted account leaves its rows unlinked, the six months
 * purge removes them. Every step checks first, so it can run again.
 */
export class AuditLogs1792454400000 implements MigrationInterface {
  name = "AuditLogs1792454400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("audit_logs"))) {
      await queryRunner.query(
        "CREATE TABLE `audit_logs` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(36) NULL, `scope` enum ('user', 'admin') NOT NULL, `action` varchar(160) NOT NULL, `resourceId` varchar(64) NULL, `statusCode` smallint NULL, `outcome` enum ('success', 'failure', 'denied') NOT NULL, `ip` varchar(64) NULL, `userAgent` varchar(500) NULL, `detail` varchar(500) NULL, INDEX `IDX_2cd10fda8276bb995288acfbfb` (`created_at`), INDEX `IDX_2254c368e04a5fbfe583f73638` (`userId`, `created_at`), INDEX `IDX_101d8eb80d0f1989ae01f5e3c0` (`scope`, `created_at`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
      );
    }
    const foreignKeys = (await queryRunner.query(
      "SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_logs' AND CONSTRAINT_NAME = 'FK_cfa83f61e4d27a87fcae1e025ab' AND CONSTRAINT_TYPE = 'FOREIGN KEY'",
    )) as unknown[];
    if (foreignKeys.length === 0) {
      await queryRunner.query(
        "ALTER TABLE `audit_logs` ADD CONSTRAINT `FK_cfa83f61e4d27a87fcae1e025ab` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION",
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("audit_logs")) {
      await queryRunner.query("DROP TABLE `audit_logs`");
    }
  }
}
