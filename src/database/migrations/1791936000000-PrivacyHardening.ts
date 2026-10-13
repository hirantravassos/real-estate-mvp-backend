import { MigrationInterface, QueryRunner } from "typeorm";
import {
  isSealedPersonalData,
  sealPersonalData,
} from "../../shared/utils/data-cipher.util";

interface RowWithText {
  id: string;
  value: string | null;
}

interface RowWithJson {
  id: string;
  value: unknown;
}

const parseJson = (value: unknown): unknown =>
  typeof value === "string" ? JSON.parse(value) : value;

/**
 * LGPD and pentest hardening:
 * - CPF and CNPJ columns grow to hold the sealed value, and every plain
 *   value already stored is sealed with DATA_ENCRYPTION_SECRET;
 * - `users.tokenVersion`, raised on logout to end every session;
 * - `access_logs`, the six months of access records of the Marco Civil.
 * Every step checks first, so it can run again.
 */
export class PrivacyHardening1791936000000 implements MigrationInterface {
  name = "PrivacyHardening1791936000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `deal_signers` MODIFY `signedDocumentNumber` varchar(255) NULL",
    );
    await queryRunner.query(
      "ALTER TABLE `property_document_lookups` MODIFY `ownerDocumentNumber` varchar(255) NULL",
    );

    if (!(await queryRunner.hasColumn("users", "tokenVersion"))) {
      await queryRunner.query(
        "ALTER TABLE `users` ADD `tokenVersion` int NOT NULL DEFAULT '0'",
      );
    }

    if (!(await queryRunner.hasTable("access_logs"))) {
      await queryRunner.query(
        "CREATE TABLE `access_logs` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `event` enum ('login', 'refresh', 'logout') NOT NULL, `ip` varchar(64) NULL, `userAgent` varchar(500) NULL, INDEX `IDX_396253f59749f08ec35257c5bf` (`created_at`), INDEX `IDX_f6d1d2c908a053a7a84493df5d` (`userId`, `created_at`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
      );
    }
    const foreignKeys = (await queryRunner.query(
      "SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'access_logs' AND CONSTRAINT_NAME = 'FK_296da70a6e13471e00daf7aebe9' AND CONSTRAINT_TYPE = 'FOREIGN KEY'",
    )) as unknown[];
    if (foreignKeys.length === 0) {
      await queryRunner.query(
        "ALTER TABLE `access_logs` ADD CONSTRAINT `FK_296da70a6e13471e00daf7aebe9` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
      );
    }

    await this.sealTextColumn(
      queryRunner,
      "deal_signers",
      "signedDocumentNumber",
    );
    await this.sealTextColumn(
      queryRunner,
      "property_document_lookups",
      "ownerDocumentNumber",
    );
    await this.sealJsonField(
      queryRunner,
      "property_legal_profiles",
      "owners",
      "documentNumber",
    );
    await this.sealJsonField(
      queryRunner,
      "assistant_actions",
      "payload",
      "ownerDocumentNumber",
    );
  }

  /** Leaves the columns wide and sealed: shrinking them would cut the data. */
  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("access_logs")) {
      await queryRunner.query("DROP TABLE `access_logs`");
    }
    if (await queryRunner.hasColumn("users", "tokenVersion")) {
      await queryRunner.query("ALTER TABLE `users` DROP COLUMN `tokenVersion`");
    }
  }

  private async sealTextColumn(
    queryRunner: QueryRunner,
    table: string,
    column: string,
  ) {
    const rows = (await queryRunner.query(
      `SELECT \`id\`, \`${column}\` AS \`value\` FROM \`${table}\` WHERE \`${column}\` IS NOT NULL AND \`${column}\` <> '' AND \`${column}\` NOT LIKE 'enc:%'`,
    )) as RowWithText[];
    for (const row of rows) {
      if (!row.value || isSealedPersonalData(row.value)) continue;
      await queryRunner.query(
        `UPDATE \`${table}\` SET \`${column}\` = ? WHERE \`id\` = ?`,
        [sealPersonalData(row.value), row.id],
      );
    }
  }

  /** Seals one string field of a JSON column, an object or a list of them. */
  private async sealJsonField(
    queryRunner: QueryRunner,
    table: string,
    column: string,
    field: string,
  ) {
    const rows = (await queryRunner.query(
      `SELECT \`id\`, \`${column}\` AS \`value\` FROM \`${table}\` WHERE \`${column}\` IS NOT NULL`,
    )) as RowWithJson[];
    for (const row of rows) {
      const parsed = parseJson(row.value);
      let changed = false;
      const sealOne = (item: unknown) => {
        if (!item || typeof item !== "object") return item;
        const record = item as Record<string, unknown>;
        const text = record[field];
        if (typeof text !== "string" || !text || isSealedPersonalData(text)) {
          return item;
        }
        changed = true;
        return { ...record, [field]: sealPersonalData(text) };
      };
      const sealed = Array.isArray(parsed)
        ? parsed.map(sealOne)
        : sealOne(parsed);
      if (!changed) continue;
      await queryRunner.query(
        `UPDATE \`${table}\` SET \`${column}\` = ? WHERE \`id\` = ?`,
        [JSON.stringify(sealed), row.id],
      );
    }
  }
}
