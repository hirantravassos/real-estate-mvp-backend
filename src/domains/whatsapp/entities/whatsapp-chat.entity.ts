import { Column, Entity, ManyToOne, Unique } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { ColumnPhone } from "../../../shared/decorators/columns/column-phone.decorator";

@Entity("whatsapp_chats")
@Unique(["whatsappId", "userId"])
export class WhatsappChat extends BaseEntity {
  @ManyToOne(() => User, {
    nullable: false,
    createForeignKeyConstraints: false,
  })
  user: User;

  @Column({ type: "varchar", length: 255 })
  userId: string;

  @Column({ type: "varchar", length: 255 })
  whatsappId: string;

  @ColumnPhone()
  phone: string;

  @Column({
    type: "boolean",
    default: true,
  })
  unread: boolean;

  @Column({ type: "datetime", nullable: true })
  lastSentAt: string | null;
}
