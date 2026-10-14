import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The public listings the hunts already read, kept per broker so a new hunt
 * reuses them instead of paying the AI again. Every step checks first, so it
 * can run again.
 */
export class HuntedListings1792108800000 implements MigrationInterface {
  name = "HuntedListings1792108800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("hunted_listings"))) {
      await queryRunner.query(
        "CREATE TABLE `hunted_listings` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `portal` enum ('zap_imoveis', 'viva_real', 'quinto_andar', 'olx', 'chaves_na_mao', 'imovelweb') NOT NULL, `url` varchar(1024) NOT NULL, `urlHash` char(64) NOT NULL, `isListing` tinyint NOT NULL, `title` varchar(255) NOT NULL, `snapshot` json NULL, `analyzedAt` datetime NOT NULL, UNIQUE INDEX `IDX_6e289c058c0222d10e5cb5835f` (`userId`, `urlHash`), INDEX `IDX_3273bb8e3f138107195e2d6b2a` (`userId`, `analyzedAt`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
      );
    }

    const foreignKeys = (await queryRunner.query(
      "SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'hunted_listings' AND CONSTRAINT_NAME = 'FK_1659811d0cee1c5b7820e7f207c' AND CONSTRAINT_TYPE = 'FOREIGN KEY'",
    )) as unknown[];
    if (foreignKeys.length === 0) {
      await queryRunner.query(
        "ALTER TABLE `hunted_listings` ADD CONSTRAINT `FK_1659811d0cee1c5b7820e7f207c` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("hunted_listings")) {
      await queryRunner.query("DROP TABLE `hunted_listings`");
    }
  }
}
