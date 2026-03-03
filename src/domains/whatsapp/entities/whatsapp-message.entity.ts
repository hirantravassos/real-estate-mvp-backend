import { Column, Entity, JoinColumn, ManyToOne, Unique } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { WhatsappChat } from "./whatsapp-chat.entity";

@Entity("whatsapp_messages")
@Unique(["user", "remoteJid", "messageId"])
export class WhatsappMessage extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ name: "userId", type: "uuid" })
  userId: string;

  @ManyToOne(() => WhatsappChat, (chat) => chat.messages, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn([
    { name: "userId", referencedColumnName: "userId" },
    { name: "remoteJid", referencedColumnName: "jid" },
  ])
  chat: WhatsappChat;

  @Column({ type: "varchar", length: 255 })
  remoteJid: string;

  @Column({ type: "varchar", length: 255 })
  messageId: string;

  @Column({ type: "boolean", default: false })
  fromMe: boolean;

  @Column({ type: "varchar", length: 50, nullable: true })
  type: string | null;

  @Column({ type: "text", nullable: true })
  content: string | null;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  timestamp: Date;
}
