import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
} from "typeorm";
import { UUID_LENGTH } from "../constants/field-lengths.constant.js";

export abstract class BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  readonly createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamp" })
  readonly updatedAt!: Date;

  @Column({
    type: "varchar",
    length: UUID_LENGTH,
    nullable: true,
    name: "updated_by",
  })
  updatedBy!: string | null;

  @Column({
    type: "boolean",
    default: true,
    name: "is_active",
  })
  active: boolean;
}
