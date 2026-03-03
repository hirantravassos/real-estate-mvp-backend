import { Column, Entity, OneToMany } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity.js";
import { ColumnName } from "../../../shared/decorators/columns/column-name.decorator.js";
import { ColumnEmail } from "../../../shared/decorators/columns/column-email.decorator.js";
import { Customer } from "../../customers/entities/customer.entity";
import { WhatsappChat } from "../../whatsapp/entities/whatsapp-chat.entity";

@Entity("users")
export class User extends BaseEntity {
  @OneToMany(() => Customer, (customer) => customer.user)
  customers: Customer[];

  @OneToMany(() => WhatsappChat, (whatsappChat) => whatsappChat.user)
  whatsappChats: WhatsappChat[];

  @ColumnEmail({ unique: true })
  email: string;

  @ColumnName()
  name: string;

  @Column({ type: "varchar", length: 1000 })
  googleId: string;
}
