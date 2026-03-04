import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { WhatsappContact } from "./whatsapp-contact.entity";
import { WhatsappMessage } from "./whatsapp-message.entity";

@Entity("whatsapp_chats")
@Unique(["whatsappId", "user"])
export class WhatsappChat extends BaseEntity {
  @ManyToOne(() => User, (user) => user.whatsappChats, {
    nullable: false,
    onDelete: "CASCADE",
  })
  user: User;

  @ManyToOne(() => WhatsappContact, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn([
    { name: "whatsappId", referencedColumnName: "whatsappId" },
    { name: "userId", referencedColumnName: "user" },
  ])
  contact: WhatsappContact;

  @OneToMany(() => WhatsappMessage, (whatsappMessage) => whatsappMessage.chat)
  messages: WhatsappMessage[];

  @Column({ type: "varchar", length: 255 })
  whatsappId: string;

  @Column({
    type: "boolean",
    default: true,
  })
  unread: boolean;
}
