import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The assistant can keep files that arrived in a WhatsApp chat in a sale
 * checklist, a new value on `assistant_actions.kind`.
 */
export class AssistantDealDocuments1792108800000 implements MigrationInterface {
  name = "AssistantDealDocuments1792108800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `assistant_actions` CHANGE `kind` `kind` enum ('send_message', 'schedule_visit', 'add_note', 'move_stage', 'mark_lost', 'link_deal_documents', 'property_hunt', 'owner_search', 'contact_import', 'certificate_lookup') NOT NULL",
    );
  }

  /** Fails while actions still use the new kind, on purpose. */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `assistant_actions` CHANGE `kind` `kind` enum ('send_message', 'schedule_visit', 'add_note', 'move_stage', 'mark_lost', 'property_hunt', 'owner_search', 'contact_import', 'certificate_lookup') NOT NULL",
    );
  }
}
