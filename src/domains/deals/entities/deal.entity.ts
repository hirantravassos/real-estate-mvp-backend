import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { ColumnCurrency } from "../../../shared/decorators/columns/column-currency.decorator";
import { ColumnBoolean } from "../../../shared/decorators/columns/column-boolean.decorator";
import { User } from "../../users/entities/user.entity";
import { Customer } from "../../customers/entities/customer.entity";
import { Property } from "../../properties/entities/property.entity";
import {
  DealPaymentMethod,
  DealSellerType,
  DealStage,
  DealStatus,
} from "../enums/deal.enum";
import { DealChecklistItem } from "./deal-checklist-item.entity";
import { DealSigner } from "./deal-signer.entity";
import { DealMilestone } from "./deal-milestone.entity";
import { DealEvent } from "./deal-event.entity";
import { DealPartner } from "./deal-partner.entity";
import { DealParticipant } from "./deal-participant.entity";

/**
 * The closing room of one sale: proposal, paperwork, contract signatures and
 * the steps until the keys are handed over.
 */
@Entity("deals")
export class Deal extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @ManyToOne(() => Customer, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "customerId" })
  customer: Customer;

  @Column({ type: "uuid", nullable: false })
  customerId: string;

  @ManyToOne(() => Property, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "propertyId" })
  property: Property | null;

  @Column({ type: "uuid", nullable: true })
  propertyId: string | null;

  @Column({ type: "enum", enum: DealStage, default: DealStage.PROPOSAL })
  stage: DealStage;

  @Column({ type: "enum", enum: DealStatus, default: DealStatus.OPEN })
  status: DealStatus;

  @ColumnCurrency({ nullable: true })
  offerAmount: string | null;

  @ColumnCurrency({ nullable: true })
  downPaymentAmount: string | null;

  @Column({ type: "enum", enum: DealPaymentMethod, nullable: true })
  paymentMethod: DealPaymentMethod | null;

  @ColumnBoolean({ default: false })
  usesFgts: boolean;

  @Column({
    type: "enum",
    enum: DealSellerType,
    default: DealSellerType.INDIVIDUAL,
  })
  sellerType: DealSellerType;

  /** Total commission of the sale, before splitting with partners. */
  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  commissionPercentage: string | null;

  /** Broker only, never shown on the customer area. */
  @Column({ type: "text", nullable: true })
  notes: string | null;

  /** Secret part of the customer area link. */
  @Index({ unique: true })
  @Column({ type: "varchar", length: 64, nullable: false })
  portalToken: string;

  @ColumnBoolean({ default: true })
  portalEnabled: boolean;

  @Column({ type: "varchar", length: 36, nullable: true })
  contractDocumentId: string | null;

  /** Fingerprint of the contract file, every signature points to it. */
  @Column({ type: "varchar", length: 64, nullable: true })
  contractSha256: string | null;

  @Column({ type: "datetime", nullable: true })
  contractUploadedAt: Date | null;

  @Column({ type: "datetime", nullable: true })
  closedAt: Date | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  cancellationReason: string | null;

  @OneToMany(() => DealChecklistItem, (item) => item.deal)
  checklistItems: DealChecklistItem[];

  @OneToMany(() => DealSigner, (signer) => signer.deal)
  signers: DealSigner[];

  @OneToMany(() => DealMilestone, (milestone) => milestone.deal)
  milestones: DealMilestone[];

  @OneToMany(() => DealEvent, (event) => event.deal)
  events: DealEvent[];

  @OneToMany(() => DealPartner, (partner) => partner.deal)
  partners: DealPartner[];

  @OneToMany(() => DealParticipant, (participant) => participant.deal)
  participants: DealParticipant[];
}
