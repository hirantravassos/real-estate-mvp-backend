import { AfterLoad, Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { repairFileName } from "../../../shared/utils/file-name.util";
import { User } from "../../users/entities/user.entity";

export enum DocumentOwnerType {
  CUSTOMER = "customer",
  PROPERTY = "property",
  /** Contract and signed copies of a sale. */
  DEAL = "deal",
  /** Files sent for one item of a sale checklist. */
  DEAL_ITEM = "deal_item",
  /** Made by the assistant or attached in its chat, the owner id is the broker. */
  ASSISTANT = "assistant",
}

@Entity("documents")
export class Document extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @Column({ type: "enum", enum: DocumentOwnerType, nullable: false })
  ownerType: DocumentOwnerType;

  @Column({ type: "varchar", nullable: false })
  ownerId: string;

  @Column({ type: "varchar", length: 255, nullable: false })
  displayName: string;

  @Column({ type: "varchar", length: 512, nullable: false, select: false })
  s3Key: string;

  @Column({ type: "varchar", length: 100, nullable: false })
  mimeType: string;

  @Column({ type: "bigint", nullable: false })
  sizeBytes: number;

  /** Which suggested document this file is, like the property registration. */
  @Column({ type: "varchar", length: 64, nullable: true })
  category: string | null;

  /** Files sent before the upload fix kept the name with broken accents. */
  @AfterLoad()
  repairDisplayName() {
    if (this.displayName) this.displayName = repairFileName(this.displayName);
  }
}
