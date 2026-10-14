import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The partner area opens only after the partner confirms their WhatsApp
 * number: failed tries and a lock on `deal_partners`, plus when the broker
 * last sent the access. `documents.uploadedByPartnerId` tells whose file it
 * is, so a partner only removes their own. Every step checks first.
 */
export class PartnerAreaAccess1792281600000 implements MigrationInterface {
  name = "PartnerAreaAccess1792281600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (
      !(await queryRunner.hasColumn("deal_partners", "failedVerifications"))
    ) {
      await queryRunner.query(
        "ALTER TABLE `deal_partners` ADD `failedVerifications` int NOT NULL DEFAULT '0'",
      );
    }
    if (
      !(await queryRunner.hasColumn("deal_partners", "verificationLockedUntil"))
    ) {
      await queryRunner.query(
        "ALTER TABLE `deal_partners` ADD `verificationLockedUntil` datetime NULL",
      );
    }
    if (!(await queryRunner.hasColumn("deal_partners", "accessSentAt"))) {
      await queryRunner.query(
        "ALTER TABLE `deal_partners` ADD `accessSentAt` datetime NULL",
      );
    }
    if (!(await queryRunner.hasColumn("documents", "uploadedByPartnerId"))) {
      await queryRunner.query(
        "ALTER TABLE `documents` ADD `uploadedByPartnerId` varchar(36) NULL",
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, column] of [
      ["documents", "uploadedByPartnerId"],
      ["deal_partners", "accessSentAt"],
      ["deal_partners", "verificationLockedUntil"],
      ["deal_partners", "failedVerifications"],
    ]) {
      if (await queryRunner.hasColumn(table, column)) {
        await queryRunner.query(
          `ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``,
        );
      }
    }
  }
}
