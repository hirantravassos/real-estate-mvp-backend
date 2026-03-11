import { Column, Entity, ManyToOne, PrimaryColumn, Unique } from "typeorm";
import { User } from "../../users/entities/user.entity";
import { ColumnPhone } from "../../../shared/decorators/columns/column-phone.decorator";
import { ColumnName } from "../../../shared/decorators/columns/column-name.decorator";

@Entity("whatsapp_chats")
@Unique(["id", "user"])
export class WhatsappChat {
  @ManyToOne(() => User, {
    nullable: false,
    createForeignKeyConstraints: false,
  })
  user: User;

  @PrimaryColumn({ type: "varchar", length: 255 })
  id: string;

  @ColumnPhone()
  phone: string;

  @ColumnName()
  name: string;

  @Column({
    type: "boolean",
    default: true,
  })
  unread: boolean;

  @Column({ type: "datetime", nullable: true })
  lastSentAt: string | null;

  @Column({ type: "varchar", nullable: true })
  lastMessage: string | null;

  @Column({ type: "varchar", nullable: true })
  profileUrl: string | null;
}
