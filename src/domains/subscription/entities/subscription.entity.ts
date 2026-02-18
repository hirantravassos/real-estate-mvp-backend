import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/entities';
import { User } from '../../auth/entities/user.entity';

@Entity('subscriptions')
export class Subscription extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 100, name: 'plan_name' })
  planName!: string;

  @Column({ type: 'boolean', default: false, name: 'is_active' })
  isActive!: boolean;

  @Column({ type: 'datetime', nullable: true, name: 'activated_at' })
  activatedAt!: Date | null;

  @Column({ type: 'datetime', nullable: true, name: 'expires_at' })
  expiresAt!: Date | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  readonly user?: User;
}
