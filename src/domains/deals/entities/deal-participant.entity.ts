import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { Customer } from "../../customers/entities/customer.entity";
import { DealParticipantRole } from "../enums/deal.enum";
import { Deal } from "./deal.entity";

/**
 * One more buyer or seller of the sale. It may come from a contact or be
 * only a nickname, like "Vendedor 2", when the broker has the paperwork but
 * not the person's details.
 */
@Entity("deal_participants")
export class DealParticipant extends BaseEntity {
  @ManyToOne(() => Deal, (deal) => deal.participants, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "dealId" })
  deal: Deal;

  @Column({ type: "uuid", nullable: false })
  dealId: string;

  @Column({ type: "enum", enum: DealParticipantRole, nullable: false })
  role: DealParticipantRole;

  /** The contact this person is, when the broker has one. */
  @ManyToOne(() => Customer, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "customerId" })
  customer: Customer | null;

  @Column({ type: "uuid", nullable: true })
  customerId: string | null;

  /** The contact's name, or the nickname the broker gave. */
  @Column({ type: "varchar", length: 255, nullable: false })
  name: string;

  @Column({ type: "int", default: 0 })
  sortOrder: number;
}
