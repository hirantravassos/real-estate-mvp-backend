import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The assistant runs the paid features after the broker confirms the price:
 * new values on `assistant_actions.kind` and a `result` column with what each
 * one brought back. Every step checks first, so it can run again.
 */
export class AssistantPaidActions1791763200000 implements MigrationInterface {
  name = "AssistantPaidActions1791763200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `assistant_actions` CHANGE `kind` `kind` enum ('send_message', 'schedule_visit', 'add_note', 'move_stage', 'mark_lost', 'property_hunt', 'owner_search', 'contact_import', 'certificate_lookup') NOT NULL",
    );
    if (!(await queryRunner.hasColumn("assistant_actions", "result"))) {
      await queryRunner.query(
        "ALTER TABLE `assistant_actions` ADD `result` json NULL",
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("assistant_actions", "result")) {
      await queryRunner.query(
        "ALTER TABLE `assistant_actions` DROP COLUMN `result`",
      );
    }
    /** Fails while actions still use the paid kinds, on purpose. */
    await queryRunner.query(
      "ALTER TABLE `assistant_actions` CHANGE `kind` `kind` enum ('send_message', 'schedule_visit', 'add_note', 'move_stage', 'mark_lost') NOT NULL",
    );
  }
}
