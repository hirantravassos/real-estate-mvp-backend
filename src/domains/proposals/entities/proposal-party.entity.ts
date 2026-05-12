import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { Proposal } from "./proposal.entity";

export enum ProposalPartyRole {
  BUYER = "buyer",
  SELLER = "seller",
}

export enum ProposalPartyKind {
  PERSON = "person",
  COMPANY = "company",
}

@Entity("proposal_parties")
export class ProposalParty extends BaseEntity {
  @ManyToOne(() => Proposal, (proposal) => proposal.parties, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "proposalId" })
  proposal: Proposal;

  @Column({ type: "varchar", nullable: false })
  proposalId: string;

  @Column({ type: "enum", enum: ProposalPartyRole, nullable: false })
  role: ProposalPartyRole;

  @Column({ type: "enum", enum: ProposalPartyKind, nullable: false })
  kind: ProposalPartyKind;

  @Column({ type: "varchar", length: 255, nullable: false })
  name: string;

  @Column({ type: "varchar", length: 20, nullable: false })
  cpfCnpj: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  email: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone: string | null;

  @Column({ type: "int", default: 1, nullable: false })
  partyOrder: number;
}
