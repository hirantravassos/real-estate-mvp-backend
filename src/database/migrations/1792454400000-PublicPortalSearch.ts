import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The portal search now reads only public pages, signed out:
 * - `listing_shortcuts` keeps the listings the broker saves, as a link and a
 *   small card, never as a property of the catalog;
 * - `portal_accounts` goes away with the platform logins and the passwords
 *   it held;
 * - the suggestions already found lose the street address, the photos, the
 *   videos, the advertiser and the long description, which are no longer
 *   collected. This scrub cannot be undone.
 * Every step checks first, so it can run again after a stop halfway.
 */
export class PublicPortalSearch1792454400000 implements MigrationInterface {
  name = "PublicPortalSearch1792454400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("listing_shortcuts"))) {
      await queryRunner.query(
        "CREATE TABLE `listing_shortcuts` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `matchId` varchar(36) NULL, `portal` enum ('zap_imoveis', 'viva_real', 'quinto_andar', 'olx', 'chaves_na_mao', 'imovelweb') NOT NULL, `externalUrl` varchar(1024) NOT NULL, `title` varchar(255) NOT NULL, `kind` enum ('house', 'apartment', 'commercial', 'land') NULL, `transaction` varchar(10) NULL, `price` decimal(15,2) NULL, `bedrooms` int NULL, `area` decimal(10,2) NULL, `neighborhood` varchar(120) NULL, `city` varchar(120) NULL, `state` varchar(2) NULL, `summary` varchar(400) NULL, INDEX `IDX_listing_shortcuts_user_created` (`userId`, `created_at`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
      );
      await queryRunner.query(
        "ALTER TABLE `listing_shortcuts` ADD CONSTRAINT `FK_listing_shortcuts_user` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
      );
    }

    if (await queryRunner.hasTable("portal_accounts")) {
      await queryRunner.query("DROP TABLE `portal_accounts`");
    }

    if (await queryRunner.hasTable("property_matches")) {
      await queryRunner.query(
        "UPDATE `property_matches` SET `listing` = JSON_SET(JSON_REMOVE(`listing`, '$.address', '$.photos', '$.videos', '$.advertiser'), '$.description', CAST('null' AS JSON)) WHERE `listing` IS NOT NULL",
      );
      await queryRunner.query(
        "UPDATE `property_matches` SET `coverImageUrl` = NULL WHERE `origin` = 'portal'",
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("listing_shortcuts")) {
      await queryRunner.query("DROP TABLE `listing_shortcuts`");
    }
    if (!(await queryRunner.hasTable("portal_accounts"))) {
      await queryRunner.query(
        "CREATE TABLE `portal_accounts` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NULL, `portal` enum ('zap_imoveis', 'viva_real', 'quinto_andar', 'olx', 'chaves_na_mao', 'imovelweb') NOT NULL, `login` varchar(255) NOT NULL, `passwordCipher` text NULL, `sessionCipher` longtext NULL, `status` enum ('unchecked', 'awaiting_code', 'connected', 'failed') NOT NULL DEFAULT 'unchecked', `statusMessage` varchar(255) NULL, `connectedAt` datetime NULL, `lastUsedAt` datetime NULL, INDEX `IDX_e5648e7b7524dc44c386941e99` (`userId`, `portal`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
      );
      await queryRunner.query(
        "ALTER TABLE `portal_accounts` ADD CONSTRAINT `FK_82bfa6bec37a6a5c7044c9e8e3d` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
      );
    }
  }
}
