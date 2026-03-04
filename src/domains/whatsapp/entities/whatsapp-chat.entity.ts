import { Column, Entity, ManyToOne, OneToMany, Unique } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { WhatsappMessage } from "./whatsapp-message.entity";

@Entity("whatsapp_chats")
@Unique(["whatsappId", "user"])
export class WhatsappChat extends BaseEntity {
  @ManyToOne(() => User, (user) => user.whatsappChats, {
    nullable: false,
    onDelete: "CASCADE",
  })
  user: User;

  @OneToMany(() => WhatsappMessage, (message) => message.chat, {
    cascade: true,
  })
  messages: WhatsappMessage[];

  @Column({ type: "varchar", length: 255 })
  whatsappId: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  name: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  phoneNumber: string | null;

  @Column({
    type: "boolean",
    default: true,
  })
  unread: boolean;
}
