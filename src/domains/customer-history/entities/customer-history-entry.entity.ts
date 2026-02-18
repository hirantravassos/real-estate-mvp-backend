import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/entities';
import { Customer } from '../../customer/entities/customer.entity';

export enum CustomerActionType {
  STAGE_CHANGED = 'stage_changed',
  VISIT_SCHEDULED = 'visit_scheduled',
  VISIT_FEEDBACK = 'visit_feedback',
  LOST_REASON = 'lost_reason',
  COMMENT_ADDED = 'comment_added',
  BUDGET_UPDATED = 'budget_updated',
  CUSTOMER_CREATED = 'customer_created',
}

@Entity('customer_history_entries')
export class CustomerHistoryEntry extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 36, name: 'customer_id' })
  customerId!: string;

  @Column({ type: 'enum', enum: CustomerActionType, name: 'action_type' })
  actionType!: CustomerActionType;

  @Column({ type: 'varchar', length: 500 })
  description!: string;

  @Column({ type: 'json', nullable: true })
  metadata!: Record<string, unknown> | null;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  readonly customer?: Customer;
}
