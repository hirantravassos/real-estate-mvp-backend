import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  Unique,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { ColumnPhone } from "../../../shared/decorators/columns/column-phone.decorator";
import { ColumnName } from "../../../shared/decorators/columns/column-name.decorator";
import { Customer } from "../../customers/entities/customer.entity";
import { ColumnBoolean } from "../../../shared/decorators/columns/column-boolean.decorator";
import { PropertyContact } from "../../properties/entities/property-contact.entity";

@Entity("whatsapp_chats", {
  orderBy: {
    lastSentAt: "DESC",
  },
})
@Unique(["id", "userId"])
export class WhatsappChat {
  @ManyToOne(() => User, {
    nullable: false,
    createForeignKeyConstraints: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @OneToOne(() => Customer, { createForeignKeyConstraints: false })
  @JoinColumn([
    { name: "phone", referencedColumnName: "phone" },
    { name: "userId", referencedColumnName: "userId" },
  ])
  customer?: Customer;

  @OneToMany(
    () => PropertyContact,
    (propertyContact) => propertyContact.whatsappChat,
    {
      createForeignKeyConstraints: false,
    },
  )
  propertiesContact?: PropertyContact[];

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

  @Column({ type: "text", nullable: true })
  lastMessage: string | null;

  @Column({ type: "varchar", nullable: true })
  profileUrl: string | null;

  @ColumnBoolean({ default: false })
  ignored: boolean;
}
