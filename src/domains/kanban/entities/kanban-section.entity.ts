import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/entities';
import { User } from '../../auth/entities/user.entity';

@Entity('kanban_sections')
export class KanbanSection extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'int', name: 'display_order' })
  displayOrder!: number;

  @Column({ type: 'varchar', length: 7, default: '#1890ff' })
  color!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  readonly user?: User;
}
