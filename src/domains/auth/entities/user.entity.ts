import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/entities';

@Entity('users')
export class User extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 255, name: 'full_name' })
  fullName!: string;

  @Column({ type: 'boolean', default: false, name: 'is_mfa_enabled' })
  isMfaEnabled!: boolean;
}
