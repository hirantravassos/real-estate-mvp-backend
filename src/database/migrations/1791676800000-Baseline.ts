import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Schema of release 1.0.4, the last one deployed with synchronize on.
 * Databases that already have it (production) skip the statements and only
 * get this migration recorded, empty databases get the full schema.
 */
export class Baseline1791676800000 implements MigrationInterface {
  name = "Baseline1791676800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("users")) return;

    await queryRunner.query(
      "CREATE TABLE `kanbans` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `name` varchar(255) NOT NULL, `description` text NULL, `order` int NOT NULL DEFAULT '0', PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `customer_comments` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `comment` text NULL, `customerId` varchar(36) NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `customers` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `name` varchar(255) NOT NULL, `phone` varchar(20) NOT NULL, `budget` decimal(15,2) NULL, `lost` tinyint NOT NULL DEFAULT 0, `kanbanId` varchar(36) NULL, UNIQUE INDEX `IDX_821f611c879a0d215bdfaf77c0` (`userId`, `phone`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `users` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `email` varchar(255) NOT NULL, `name` varchar(255) NOT NULL, `googleId` varchar(1000) NOT NULL, `profileImage` text NULL, UNIQUE INDEX `IDX_97672ac88f789774dd47f7c8be` (`email`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `property_contacts` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `propertyId` varchar(255) NOT NULL, `name` varchar(255) NULL, `phone` varchar(20) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `properties` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `alias` varchar(255) NULL, `address` text NOT NULL, `address2` varchar(255) NOT NULL, `comment` text NULL, `price` decimal(15,2) NOT NULL, `infoBedrooms` int NULL, `infoSuiteBedrooms` int NULL, `infoBathrooms` int NULL, `infoLift` enum ('private', 'common', 'none') NULL, `infoHasPool` tinyint NULL DEFAULT 0, `infoHasBalcony` tinyint NULL DEFAULT 0, `infoHasFancyBalcony` tinyint NULL DEFAULT 0, `infoFurniture` enum ('full', 'half', 'none') NULL, `infoParkingSpaceUnits` int NULL, `infoHasDedicatedParkingSpace` tinyint NULL DEFAULT 0, `infoSquareMeters` decimal NULL, `infoPropertyTax` decimal(15,2) NULL, `infoMaintenanceFee` decimal(15,2) NULL, `infoFloor` int NULL, `infoBeachProximityInKm` decimal NULL, `infoConciergeService` enum ('full', 'half', 'none') NULL, `infoHasAirConditioningSystem` tinyint NULL DEFAULT 0, `infoHasGasWaterHeatingSystem` tinyint NULL DEFAULT 0, `infoHasGasSystem` tinyint NULL DEFAULT 0, `infoHasGym` tinyint NULL DEFAULT 0, PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `visits` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `customerId` varchar(255) NOT NULL, `address` varchar(1000) NOT NULL, `reference` varchar(255) NULL, `startsAt` datetime NOT NULL, `endsAt` datetime NOT NULL, `notes` text NULL, `propertyId` varchar(255) NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `property_media` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `propertyId` varchar(255) NOT NULL, `type` enum ('image', 'video') NOT NULL, `displayName` varchar(255) NOT NULL, `s3Key` varchar(512) NOT NULL, `mimeType` varchar(100) NOT NULL, `sizeBytes` bigint NOT NULL, `sortOrder` int NOT NULL DEFAULT '0', `isCover` tinyint NOT NULL DEFAULT 0, PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `documents` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `ownerType` enum ('customer', 'property') NOT NULL, `ownerId` varchar(255) NOT NULL, `displayName` varchar(255) NOT NULL, `s3Key` varchar(512) NOT NULL, `mimeType` varchar(100) NOT NULL, `sizeBytes` bigint NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "ALTER TABLE `kanbans` ADD CONSTRAINT `FK_4439beb5b47c5de1aecb3853e6f` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await queryRunner.query(
      "ALTER TABLE `customer_comments` ADD CONSTRAINT `FK_f44b6030adb3b9abd5f899c5d1e` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await queryRunner.query(
      "ALTER TABLE `customers` ADD CONSTRAINT `FK_b8512aa9cef03d90ed5744c94d7` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await queryRunner.query(
      "ALTER TABLE `customers` ADD CONSTRAINT `FK_b971cc891d4cb18f363ed71316f` FOREIGN KEY (`kanbanId`) REFERENCES `kanbans`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await queryRunner.query(
      "ALTER TABLE `property_contacts` ADD CONSTRAINT `FK_86a69d7e41cdc4b3cec49f8bb80` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await queryRunner.query(
      "ALTER TABLE `property_contacts` ADD CONSTRAINT `FK_6f7980bb86aedf4c4fb4d2fd978` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await queryRunner.query(
      "ALTER TABLE `properties` ADD CONSTRAINT `FK_6b55a80fd17a5bb77b753635496` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await queryRunner.query(
      "ALTER TABLE `visits` ADD CONSTRAINT `FK_28f19616757b505532162fd6e75` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await queryRunner.query(
      "ALTER TABLE `visits` ADD CONSTRAINT `FK_75f05529507320445c79ac9b33e` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await queryRunner.query(
      "ALTER TABLE `visits` ADD CONSTRAINT `FK_d9ffdcc50887715c0ccf7d84ad5` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION",
    );
    await queryRunner.query(
      "ALTER TABLE `property_media` ADD CONSTRAINT `FK_73d27b1e7c61cb9e68ce9912842` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await queryRunner.query(
      "ALTER TABLE `property_media` ADD CONSTRAINT `FK_2e1a98c0d12a8f1478563a21daf` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await queryRunner.query(
      "ALTER TABLE `documents` ADD CONSTRAINT `FK_e300b5c2e3fefa9d6f8a3f25975` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
  }

  public down(): Promise<void> {
    throw new Error(
      "The baseline cannot be reverted, it would drop every table (kanbans, customer_comments, customers, users, property_contacts, properties, visits, property_media, documents).",
    );
  }
}
