import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";

export enum DocumentOwnerType {
  CUSTOMER = "customer",
  PROPERTY = "property",
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
}
