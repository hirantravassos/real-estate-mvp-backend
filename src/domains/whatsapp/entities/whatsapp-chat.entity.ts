import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  Unique,
} from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { WhatsappMessage } from "./whatsapp-message.entity";
import { WhatsappContact } from "./whatsapp-contact.entity";

@Entity("whatsapp_chats")
@Unique(["user", "jid"])
export class WhatsappChat extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ name: "userId", type: "uuid" })
  userId: string;

  @Column({ type: "varchar", length: 255 })
  jid: string;

  @OneToOne(() => WhatsappContact, { createForeignKeyConstraints: false })
  @JoinColumn([
    { name: "userId", referencedColumnName: "userId" },
    { name: "jid", referencedColumnName: "jid" },
  ])
  contact: WhatsappContact;

  @OneToMany(() => WhatsappMessage, (message) => message.chat)
  messages: WhatsappMessage[];

  @Column({ type: "int", default: 0 })
  unreadCount: number;

  @Column({ type: "timestamp", nullable: true })
  lastMessageTimestamp: Date | null;
}
