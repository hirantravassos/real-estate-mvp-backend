import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { ColumnPhone } from "../../../shared/decorators/columns/column-phone.decorator";
import { ColumnName } from "../../../shared/decorators/columns/column-name.decorator";
import { Customer } from "../../customers/entities/customer.entity";
import { ColumnBoolean } from "../../../shared/decorators/columns/column-boolean.decorator";

@Entity("whatsapp_chats", {
  orderBy: {
    lastSentAt: "DESC",
  },
})
@Unique(["id", "user"])
export class WhatsappChat {
  @ManyToOne(() => User, {
    nullable: false,
    createForeignKeyConstraints: false,
  })
  user: User;

  @ManyToOne(() => Customer, { createForeignKeyConstraints: false })
  @JoinColumn([
    { name: "phone", referencedColumnName: "phone" },
    { name: "userId", referencedColumnName: "userId" },
  ])
  customer?: Customer;

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

  @ColumnBoolean({ default: false })
  ignored: boolean;
}
