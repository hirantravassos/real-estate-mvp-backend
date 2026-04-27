import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { Property } from "./property.entity";

export enum PropertyMediaType {
  IMAGE = "image",
  VIDEO = "video",
}

@Entity("property_media")
export class PropertyMedia extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @ManyToOne(() => Property, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "propertyId" })
  property: Property;

  @Column({ type: "varchar", nullable: false })
  propertyId: string;

  @Column({ type: "enum", enum: PropertyMediaType, nullable: false })
  type: PropertyMediaType;

  @Column({ type: "varchar", length: 255, nullable: false })
  displayName: string;

  @Column({ type: "varchar", length: 512, nullable: false, select: false })
  s3Key: string;

  @Column({ type: "varchar", length: 100, nullable: false })
  mimeType: string;

  @Column({ type: "bigint", nullable: false })
  sizeBytes: number;

  @Column({ type: "int", nullable: false, default: 0 })
  sortOrder: number;

  @Column({ type: "boolean", nullable: false, default: false })
  isCover: boolean;
}
