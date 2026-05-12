import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { Property } from "../../properties/entities/property.entity";
import { ProposalParty } from "./proposal-party.entity";
import { ProposalDocument } from "./proposal-document.entity";

export enum ProposalStatus {
  PROPOSAL = "proposal",
  DOCUMENTATION = "documentation",
  SIGNATURE = "signature",
  PAYMENT = "payment",
  POST_SALE = "post_sale",
}

export enum ProposalCommissionType {
  PERCENT = "percent",
  FIXED = "fixed",
}

@Entity("proposals")
export class Proposal extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @ManyToOne(() => Property, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "propertyId" })
  property: Property | null;

  @Column({ type: "varchar", nullable: true })
  propertyId: string | null;

  @OneToMany(() => ProposalParty, (party) => party.proposal, { cascade: true })
  parties: ProposalParty[];

  @OneToMany(() => ProposalDocument, (doc) => doc.proposal, { cascade: true })
  documents: ProposalDocument[];

  @Column({ type: "varchar", length: 255, nullable: false })
  title: string;

  @Column({ type: "varchar", length: 50, nullable: false })
  salePrice: string;

  @Column({ type: "enum", enum: ProposalCommissionType, nullable: false })
  commissionType: ProposalCommissionType;

  @Column({ type: "varchar", length: 50, nullable: false })
  commissionValue: string;

  @Column({
    type: "enum",
    enum: ProposalStatus,
    nullable: false,
    default: ProposalStatus.PROPOSAL,
  })
  status: ProposalStatus;

  @Column({ type: "varchar", length: 36, nullable: false, unique: true })
  publicToken: string;

  @Column({ type: "text", nullable: true })
  notes: string | null;
}
