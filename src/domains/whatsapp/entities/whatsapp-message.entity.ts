import { Column, Entity, ManyToOne, Unique } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { WhatsappChat } from "./whatsapp-chat.entity";

@Entity("whatsapp_messages")
@Unique(["whatsappId", "chat", "messageId"])
export class WhatsappMessage extends BaseEntity {
  @ManyToOne(() => WhatsappChat, (chat) => chat.messages, {
    nullable: false,
    onDelete: "CASCADE",
  })
  chat: WhatsappChat;

  @Column({ type: "varchar", length: 255 })
  whatsappId: string;

  @Column({ type: "varchar", length: 255 })
  messageId: string;

  @Column({ type: "varchar", length: 255 })
  content: string;

  @Column({ type: "varchar", length: 255 })
  type: string;

  @Column({
    type: "boolean",
    default: true,
  })
  me: boolean;

  @Column({ type: "datetime" })
  sentAt: string;
}
