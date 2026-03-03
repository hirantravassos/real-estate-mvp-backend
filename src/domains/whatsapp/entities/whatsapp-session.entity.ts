import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { WhatsappConnectionStatusEnum } from "../enums/whatsapp-connection-status.enum";

@Entity("whatsapp_sessions")
export class WhatsappSession extends BaseEntity {
  @OneToOne(() => User, { nullable: false })
  @JoinColumn()
  user: User;

  @Column({ type: "varchar", length: 255 })
  qr: string;

  @Column({ type: "enum", enum: WhatsappConnectionStatusEnum })
  status: WhatsappConnectionStatusEnum;
}
