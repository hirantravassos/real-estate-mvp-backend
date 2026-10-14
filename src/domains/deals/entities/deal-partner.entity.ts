import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { Customer } from "../../customers/entities/customer.entity";
import { Deal } from "./deal.entity";

/**
 * A partner broker in the sale. Gets a private link to send paperwork and
 * sign, and takes a share of the commission.
 */
@Entity("deal_partners")
export class DealPartner extends BaseEntity {
  @ManyToOne(() => Deal, (deal) => deal.partners, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "dealId" })
  deal: Deal;

  @Column({ type: "uuid", nullable: false })
  dealId: string;

  /** The contact this partner came from, when picked from the list. */
  @ManyToOne(() => Customer, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "customerId" })
  customer: Customer | null;

  @Column({ type: "uuid", nullable: true })
  customerId: string | null;

  @Column({ type: "varchar", length: 255, nullable: false })
  name: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  email: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  creci: string | null;

  /** Part of the sale commission that goes to this partner, from 0 to 100. */
  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  commissionShare: string | null;

  /** Secret part of this partner's own area link. */
  @Index({ unique: true })
  @Column({ type: "varchar", length: 64, nullable: false })
  accessToken: string;

  /** Wrong numbers typed in a row to open the area. */
  @Column({ type: "int", default: 0 })
  failedVerifications: number;

  /** Too many wrong numbers: the area stays shut until then. */
  @Column({ type: "datetime", nullable: true })
  verificationLockedUntil: Date | null;

  /** When the broker last sent the access by WhatsApp. */
  @Column({ type: "datetime", nullable: true })
  accessSentAt: Date | null;
}
