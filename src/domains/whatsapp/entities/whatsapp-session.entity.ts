import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { ColumnName } from "../../../shared/decorators/columns/column-name.decorator";
import { WhatsappConnectionStatusEnum } from "../enums/whatsapp-connection-status.enum";

@Entity("whatsapp_sessions")
export class WhatsappSession extends BaseEntity {
  @OneToOne(() => User, { nullable: false })
  @JoinColumn()
  user: User;

  @ColumnName({ nullable: true })
  name: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  qr: string | null;

  @Column({ type: "enum", enum: WhatsappConnectionStatusEnum })
  status: WhatsappConnectionStatusEnum;
}
