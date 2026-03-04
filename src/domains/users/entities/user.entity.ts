import { Column, Entity, OneToMany } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity.js";
import { ColumnName } from "../../../shared/decorators/columns/column-name.decorator.js";
import { ColumnEmail } from "../../../shared/decorators/columns/column-email.decorator.js";
import { Customer } from "../../customers/entities/customer.entity";
import { WhatsappChat } from "../../whatsapp/entities/whatsapp-chat.entity";
import { WhatsappMessage } from "../../whatsapp/entities/whatsapp-message.entity";
import { WhatsappContact } from "../../whatsapp/entities/whatsapp-contact.entity";

@Entity("users")
export class User extends BaseEntity {
  @OneToMany(() => Customer, (customer) => customer.user)
  customers: Customer[];

  @OneToMany(() => WhatsappChat, (chat) => chat.user)
  whatsappChats: WhatsappChat[];

  @OneToMany(() => WhatsappMessage, (message) => message.user)
  whatsappMessages: WhatsappMessage[];

  @OneToMany(() => WhatsappContact, (contact) => contact.user)
  whatsappContacts: WhatsappContact[];

  @ColumnEmail({ unique: true })
  email: string;

  @ColumnName()
  name: string;

  @Column({ type: "varchar", length: 1000 })
  googleId: string;
}
