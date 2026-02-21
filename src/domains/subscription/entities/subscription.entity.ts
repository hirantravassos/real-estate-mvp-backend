import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/entities';
import { User } from '../../auth/entities/user.entity';

export enum SubscriptionStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

@Entity('subscriptions')
export class Subscription extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 100, name: 'plan_name' })
  planName!: string;

  @Column({ type: 'boolean', default: false, name: 'is_active' })
  isActive!: boolean;

  @Column({
    type: 'varchar',
    length: 20,
    default: SubscriptionStatus.PENDING,
    name: 'status',
  })
  status!: SubscriptionStatus;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'amount',
  })
  amount!: number;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'payment_id' })
  paymentId!: string | null;

  @Column({ type: 'text', nullable: true, name: 'pix_copy_paste' })
  pixCopyPaste!: string | null;

  @Column({ type: 'datetime', nullable: true, name: 'activated_at' })
  activatedAt!: Date | null;

  @Column({ type: 'datetime', nullable: true, name: 'expires_at' })
  expiresAt!: Date | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  readonly user?: User;
}
