import { Column, Entity, JoinColumn, ManyToOne, Unique } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { WhatsappChat } from "./whatsapp-chat.entity";

@Entity("whatsapp_messages")
@Unique("UQ_WHATSAPP_MESSAGE_COMPOSITE", ["whatsappId", "messageId", "user"])
export class WhatsappMessage extends BaseEntity {
  @ManyToOne(() => User, (user) => user.whatsappMessages, {
    nullable: false,
    onDelete: "CASCADE",
  })
  user: User;

  @ManyToOne(() => WhatsappChat, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn([
    { name: "whatsappId", referencedColumnName: "whatsappId" },
    { referencedColumnName: "user" },
  ])
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
