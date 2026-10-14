import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { ColumnBoolean } from "../../../shared/decorators/columns/column-boolean.decorator";
import { DealChecklistStatus, DealParty } from "../enums/deal.enum";
import { DealParticipant } from "./deal-participant.entity";
import { Deal } from "./deal.entity";

/** One piece of paperwork the sale needs, like the buyer's ID. */
@Entity("deal_checklist_items")
export class DealChecklistItem extends BaseEntity {
  @ManyToOne(() => Deal, (deal) => deal.checklistItems, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "dealId" })
  deal: Deal;

  @Column({ type: "uuid", nullable: false })
  dealId: string;

  @Column({ type: "enum", enum: DealParty, nullable: false })
  party: DealParty;

  /**
   * The buyer or seller this paper belongs to. Empty means the main buyer
   * (the deal customer) or the seller, when no seller was named.
   */
  @ManyToOne(() => DealParticipant, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "participantId" })
  participant: DealParticipant | null;

  @Column({ type: "uuid", nullable: true })
  participantId: string | null;

  @Column({ type: "varchar", length: 255, nullable: false })
  title: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  description: string | null;

  @Column({
    type: "enum",
    enum: DealChecklistStatus,
    default: DealChecklistStatus.PENDING,
  })
  status: DealChecklistStatus;

  /** Why it was asked again, or which restriction the certificate shows. */
  @Column({ type: "varchar", length: 500, nullable: true })
  rejectionReason: string | null;

  /**
   * Part of the restriction screening: a certificate or search that tells
   * whether the owner can really sell, like debts, lawsuits or liens.
   */
  @ColumnBoolean({ default: false })
  screening: boolean;

  /** Shown on the customer area so the customer sends it themselves. */
  @ColumnBoolean({ default: false })
  requestedFromCustomer: boolean;

  @Column({ type: "int", default: 0 })
  sortOrder: number;

  @Column({ type: "datetime", nullable: true })
  submittedAt: Date | null;

  @Column({ type: "datetime", nullable: true })
  reviewedAt: Date | null;
}
