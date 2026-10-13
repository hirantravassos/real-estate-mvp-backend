import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * `customers.roles`: buyer, seller and partner broker, more than one per
 * contact. Every contact so far was a buyer, and the ones already picked as a
 * partner in a deal also get the partner role. Every step checks first, so it
 * can run again.
 */
export class CustomerRoles1792022400000 implements MigrationInterface {
  name = "CustomerRoles1792022400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("customers", "roles"))) {
      await queryRunner.query(
        "ALTER TABLE `customers` ADD `roles` set ('buyer', 'seller', 'partner') NOT NULL DEFAULT 'buyer'",
      );
    }

    await queryRunner.query(
      "UPDATE `customers` SET `roles` = CONCAT_WS(',', NULLIF(`roles`, ''), 'partner') WHERE FIND_IN_SET('partner', `roles`) = 0 AND `id` IN (SELECT `customerId` FROM `deal_partners` WHERE `customerId` IS NOT NULL)",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("customers", "roles")) {
      await queryRunner.query("ALTER TABLE `customers` DROP COLUMN `roles`");
    }
  }
}
