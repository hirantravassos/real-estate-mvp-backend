import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { ColumnBoolean } from "../../../shared/decorators/columns/column-boolean.decorator";
import { WhatsappClientStatusEnum } from "../enums/whatsapp-client-status.enum";

@Entity("whatsapp_status")
export class WhatsappStatus extends BaseEntity {
  @OneToOne(() => User, (user) => user.whatsappStatus)
  @JoinColumn()
  user: User;

  @Column({ type: "varchar", length: 500, nullable: true })
  qr: string | null;

  @Column({ type: "enum", enum: WhatsappClientStatusEnum })
  status: WhatsappClientStatusEnum;

  @ColumnBoolean()
  isSyncing: boolean;

  @ColumnBoolean()
  hasUpdates: boolean;
}
