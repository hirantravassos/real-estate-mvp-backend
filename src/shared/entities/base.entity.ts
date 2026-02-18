import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';

/**
 * Abstract base entity containing common audit columns.
 * All domain entities should extend this class.
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  readonly id!: string;

  @CreateDateColumn({ name: 'created_at' })
  readonly createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  readonly updatedAt!: Date;

  @Column({ type: 'varchar', length: 36, nullable: true, name: 'updated_by' })
  updatedBy!: string | null;
}
