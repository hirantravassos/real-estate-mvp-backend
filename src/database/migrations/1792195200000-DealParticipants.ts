import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * More than one buyer or seller per sale, each with their own paperwork:
 * `deal_participants` and `deal_checklist_items.participantId`. Every step
 * checks first, so it can run again.
 */
export class DealParticipants1792195200000 implements MigrationInterface {
  name = "DealParticipants1792195200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("deal_participants"))) {
      await queryRunner.query(
        "CREATE TABLE `deal_participants` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `dealId` varchar(255) NOT NULL, `role` enum ('buyer', 'seller') NOT NULL, `customerId` varchar(255) NULL, `name` varchar(255) NOT NULL, `sortOrder` int NOT NULL DEFAULT '0', PRIMARY KEY (`id`)) ENGINE=InnoDB",
      );
      await queryRunner.query(
        "ALTER TABLE `deal_participants` ADD CONSTRAINT `FK_8ebe64f6fc8771410e4fd2814a8` FOREIGN KEY (`dealId`) REFERENCES `deals`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
      );
      await queryRunner.query(
        "ALTER TABLE `deal_participants` ADD CONSTRAINT `FK_ac9f0c3b85e823eaf56b400afb8` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION",
      );
    }

    if (
      !(await queryRunner.hasColumn("deal_checklist_items", "participantId"))
    ) {
      await queryRunner.query(
        "ALTER TABLE `deal_checklist_items` ADD `participantId` varchar(255) NULL",
      );
      await queryRunner.query(
        "ALTER TABLE `deal_checklist_items` ADD CONSTRAINT `FK_9bb520b9b5d59163cde02878e3b` FOREIGN KEY (`participantId`) REFERENCES `deal_participants`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION",
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("deal_checklist_items", "participantId")) {
      await queryRunner.query(
        "ALTER TABLE `deal_checklist_items` DROP FOREIGN KEY `FK_9bb520b9b5d59163cde02878e3b`",
      );
      await queryRunner.query(
        "ALTER TABLE `deal_checklist_items` DROP COLUMN `participantId`",
      );
    }
    if (await queryRunner.hasTable("deal_participants")) {
      await queryRunner.query("DROP TABLE `deal_participants`");
    }
  }
}
