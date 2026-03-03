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
import { WhatsappChat } from "./whatsapp-chat.entity";

@Entity("whatsapp_contacts")
@Unique(["user", "jid"])
export class WhatsappContact extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ name: "userId", type: "uuid" })
  userId: string;

  @OneToOne(() => WhatsappChat, (chat) => chat.contact)
  chat: WhatsappChat;

  @Column({ type: "varchar", length: 255 })
  jid: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  name: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  pushName: string | null;
}
