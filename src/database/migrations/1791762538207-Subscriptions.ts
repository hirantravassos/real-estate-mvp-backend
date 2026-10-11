import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Paid plans: the subscription of each broker, its Pix and card payments,
 * and the monthly plan credits as a new kind of credit transaction.
 * Every step checks first, so it can run again after stopping halfway.
 */
export class Subscriptions1791762538207 implements MigrationInterface {
  name = "Subscriptions1791762538207";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("subscriptions"))) {
      await queryRunner.query(
        "CREATE TABLE `subscriptions` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `planKey` enum ('basic', 'recommended', 'premium') NULL, `paymentMethod` enum ('card', 'pix') NULL, `trialEndsAt` datetime NOT NULL, `paidThrough` datetime NULL, `cardPriceInBrl` decimal(10,2) NULL, `providerPreapprovalId` varchar(100) NULL, `providerPreapprovalStatus` varchar(30) NULL, `cardSubscribedAt` datetime NULL, `canceledAt` datetime NULL, `lastPaymentFailedAt` datetime NULL, `lastPaymentFailureReason` varchar(255) NULL, `lastSyncedAt` datetime NULL, INDEX `IDX_17f444b8f074ee5677e0171f3c` (`providerPreapprovalId`), UNIQUE INDEX `REL_fbdba4e2ac694cf8c9cecf4dc8` (`userId`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
      );
    }

    if (!(await queryRunner.hasTable("subscription_payments"))) {
      await queryRunner.query(
        "CREATE TABLE `subscription_payments` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `subscriptionId` varchar(255) NOT NULL, `planKey` enum ('basic', 'recommended', 'premium') NOT NULL, `method` enum ('card', 'pix') NOT NULL, `status` enum ('pending', 'paid', 'expired', 'failed') NOT NULL DEFAULT 'pending', `amountInBrl` decimal(10,2) NOT NULL, `credits` int NOT NULL, `provider` varchar(30) NOT NULL, `providerPaymentId` varchar(100) NULL, `pixCode` text NULL, `pixQrCodeBase64` mediumtext NULL, `expiresAt` datetime NULL, `periodStart` datetime NULL, `periodEnd` datetime NULL, `paidAt` datetime NULL, UNIQUE INDEX `IDX_4bbf27273703f67a057f423341` (`provider`, `providerPaymentId`), INDEX `IDX_8181e988b67292583d38c59d50` (`userId`, `created_at`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
      );
    }

    await queryRunner.query(
      "ALTER TABLE `credit_transactions` CHANGE `kind` `kind` enum ('purchase', 'usage', 'bonus', 'grant', 'refund', 'subscription') NOT NULL",
    );

    await this.addForeignKeyIfMissing(
      queryRunner,
      "subscriptions",
      "FK_fbdba4e2ac694cf8c9cecf4dc84",
      "ALTER TABLE `subscriptions` ADD CONSTRAINT `FK_fbdba4e2ac694cf8c9cecf4dc84` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "subscription_payments",
      "FK_e0094f54cd7b0b5dc7c22298c72",
      "ALTER TABLE `subscription_payments` ADD CONSTRAINT `FK_e0094f54cd7b0b5dc7c22298c72` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    /** Fails while plan credits are in the statement, on purpose. */
    await queryRunner.query(
      "ALTER TABLE `credit_transactions` CHANGE `kind` `kind` enum ('purchase', 'usage', 'bonus', 'grant', 'refund') NOT NULL",
    );
    if (await queryRunner.hasTable("subscription_payments")) {
      await queryRunner.query("DROP TABLE `subscription_payments`");
    }
    if (await queryRunner.hasTable("subscriptions")) {
      await queryRunner.query("DROP TABLE `subscriptions`");
    }
  }

  private async addForeignKeyIfMissing(
    queryRunner: QueryRunner,
    table: string,
    name: string,
    sql: string,
  ) {
    const rows = (await queryRunner.query(
      "SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'",
      [table, name],
    )) as unknown[];
    if (rows.length > 0) return;
    await queryRunner.query(sql);
  }
}
