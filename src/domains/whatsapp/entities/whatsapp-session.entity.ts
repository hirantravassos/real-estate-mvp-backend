import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";

@Entity("whatsapp_sessions")
export class WhatsappSession extends BaseEntity {
  @OneToOne(() => User, { nullable: false })
  @JoinColumn()
  user: User;

  @Column({ type: "longtext", nullable: true })
  credentials: string | null;

  @Column({ type: "longtext", nullable: true })
  keys: string | null;

  @Column({ type: "boolean", default: false, name: "is_connected" })
  isConnected: boolean;

  @Column({ type: "timestamp", nullable: true, name: "last_connected_at" })
  lastConnectedAt: Date | null;
}
