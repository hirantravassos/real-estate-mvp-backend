import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import {
  DealSignatureMethod,
  DealSignerRole,
  DealSignerStatus,
} from "../enums/deal.enum";
import { Deal } from "./deal.entity";

/** Someone who must sign the contract, with the evidence of how they did. */
@Entity("deal_signers")
export class DealSigner extends BaseEntity {
  @ManyToOne(() => Deal, (deal) => deal.signers, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "dealId" })
  deal: Deal;

  @Column({ type: "uuid", nullable: false })
  dealId: string;

  /** Set when the signer is a partner broker of the sale. */
  @Column({ type: "uuid", nullable: true })
  partnerId: string | null;

  @Column({ type: "varchar", length: 255, nullable: false })
  name: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  email: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone: string | null;

  @Column({ type: "enum", enum: DealSignerRole, nullable: false })
  role: DealSignerRole;

  /** Secret part of this signer's own signing link. */
  @Index({ unique: true })
  @Column({ type: "varchar", length: 64, nullable: false })
  signingToken: string;

  @Column({
    type: "enum",
    enum: DealSignerStatus,
    default: DealSignerStatus.PENDING,
  })
  status: DealSignerStatus;

  @Column({ type: "enum", enum: DealSignatureMethod, nullable: true })
  method: DealSignatureMethod | null;

  @Column({ type: "datetime", nullable: true })
  signedAt: Date | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  signedName: string | null;

  @Column({ type: "varchar", length: 14, nullable: true })
  signedDocumentNumber: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  signedIp: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  signedUserAgent: string | null;

  /** The contract fingerprint at the moment of signing. */
  @Column({ type: "varchar", length: 64, nullable: true })
  signedContractSha256: string | null;

  /** The copy signed on gov.br, when that was the way. */
  @Column({ type: "varchar", length: 36, nullable: true })
  signedDocumentId: string | null;
}
