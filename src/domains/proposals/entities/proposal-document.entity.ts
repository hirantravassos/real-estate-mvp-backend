import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { Proposal } from "./proposal.entity";
import { ProposalParty } from "./proposal-party.entity";

export enum ProposalDocumentCategory {
  PERSONAL = "personal",
  COMPANY = "company",
  PROPERTY = "property",
  TRAMITACAO = "tramitacao",
}

@Entity("proposal_documents")
export class ProposalDocument extends BaseEntity {
  @ManyToOne(() => Proposal, (proposal) => proposal.documents, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "proposalId" })
  proposal: Proposal;

  @Column({ type: "varchar", nullable: false })
  proposalId: string;

  @ManyToOne(() => ProposalParty, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "partyId" })
  party: ProposalParty | null;

  @Column({ type: "varchar", nullable: true })
  partyId: string | null;

  @Column({ type: "enum", enum: ProposalDocumentCategory, nullable: false })
  category: ProposalDocumentCategory;

  @Column({ type: "varchar", length: 255, nullable: false })
  displayName: string;

  @Column({ type: "varchar", length: 512, nullable: false, select: false })
  s3Key: string;

  @Column({ type: "varchar", length: 100, nullable: false })
  mimeType: string;

  @Column({ type: "bigint", nullable: false })
  sizeBytes: number;
}
