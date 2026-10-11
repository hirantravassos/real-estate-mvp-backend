import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";

export enum PropertyDocumentLookupStatus {
  /** The certificate was issued and stored with the property documents. */
  FOUND = "found",
  /** The portal answered, but had nothing for the data sent. */
  NOT_FOUND = "not_found",
  FAILED = "failed",
}

/** One automatic fetch of a public certificate, kept for the broker and the bill. */
@Entity("property_document_lookups")
@Index(["propertyId", "createdAt"])
export class PropertyDocumentLookup extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @Column({ type: "varchar", nullable: false })
  propertyId: string;

  @Column({ type: "varchar", length: 60, nullable: false })
  lookupKey: string;

  /** The owner the certificate is about, null for certificates of the property. */
  @Column({ type: "varchar", length: 14, nullable: true })
  ownerDocumentNumber: string | null;

  @Column({
    type: "enum",
    enum: PropertyDocumentLookupStatus,
    nullable: false,
  })
  status: PropertyDocumentLookupStatus;

  @Column({ type: "varchar", length: 255, nullable: false })
  message: string;

  @Column({ type: "int", nullable: false, default: 0 })
  creditsCharged: number;

  @Column({ type: "decimal", precision: 10, scale: 4, nullable: true })
  providerCostInBrl: string | null;

  @Column({ type: "json", nullable: false })
  documentIds: string[];
}
