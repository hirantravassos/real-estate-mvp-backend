import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/entities';
import { User } from '../../auth/entities/user.entity';
import { KanbanSection } from '../../kanban/entities/kanban-section.entity';

/**
 * Customer entity — main information fields.
 * To modify customer fields, update this entity and the corresponding DTOs in ../dtos/.
 */
@Entity('customers')
export class Customer extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId!: string;

  @Index()
  @Column({
    type: 'varchar',
    length: 36,
    name: 'kanban_section_id',
    nullable: true,
  })
  kanbanSectionId!: string;

  /* ============================================================
   * CUSTOMER FIELDS — Edit here to change what data a customer holds.
   * After editing, also update:
   *   - CreateCustomerDto  (src/domains/customer/dtos/create-customer.dto.ts)
   *   - UpdateCustomerDto  (src/domains/customer/dtos/update-customer.dto.ts)
   * ============================================================ */

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 20 })
  phone!: string;

  @Column({ type: 'text', nullable: true })
  comments!: string | null;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    name: 'min_budget',
  })
  minBudget!: number | null;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    name: 'max_budget',
  })
  maxBudget!: number | null;

  /* ============================================================ */

  @Column({ type: 'int', default: 0, name: 'kanban_order' })
  kanbanOrder!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  readonly user?: User;

  @ManyToOne(() => KanbanSection, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'kanban_section_id' })
  readonly kanbanSection?: KanbanSection;
}
