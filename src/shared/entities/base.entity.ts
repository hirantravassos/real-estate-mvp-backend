import {
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export abstract class BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  readonly createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamp" })
  readonly updatedAt!: Date;

  @Column({
    type: "boolean",
    default: true,
  })
  active: boolean;
}
