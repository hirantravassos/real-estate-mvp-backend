import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { WhatsappAccount } from "./whatsapp-account.entity";
import { WhatsappContact } from "./whatsapp-contact.entity";
import { WhatsappMessage } from "./whatsapp-message.entity";

@Entity("whatsapp_chats")
export class WhatsappChat extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @ManyToOne(() => WhatsappAccount, (account) => account.chats, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "whatsappAccountId" })
  whatsappAccount: WhatsappAccount;

  @Column({ type: "varchar", nullable: false })
  whatsappAccountId: string;

  @ManyToOne(() => WhatsappContact, (contact) => contact.chats, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "contactId" })
  contact: WhatsappContact;

  @Column({ type: "varchar", nullable: false })
  contactId: string;

  @Column({ type: "timestamp", nullable: true })
  lastMessageAt: Date | null;

  @Column({ type: "int", default: 0 })
  unreadCount: number;

  @OneToMany(() => WhatsappMessage, (message) => message.chat, {
    cascade: true,
  })
  messages: WhatsappMessage[];
}
