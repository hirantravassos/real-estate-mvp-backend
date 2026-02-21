import { Entity, Column, OneToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { User } from '../../auth/entities/user.entity';

export enum WhatsAppStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  QR_READY = 'QR_READY',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

@Entity('whatsapp_sessions')
export class WhatsAppSession extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId!: string;

  @Column({
    type: 'enum',
    enum: WhatsAppStatus,
    default: WhatsAppStatus.DISCONNECTED,
  })
  status!: WhatsAppStatus;

  @Column({ type: 'longtext', nullable: true })
  authData!: string | null;

  @Column({ type: 'text', nullable: true })
  qrCode!: string | null;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  readonly user?: User;
}
