import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { WhatsappAccount } from "./whatsapp-account.entity";
import { WhatsappChat } from "./whatsapp-chat.entity";

@Entity("whatsapp_contacts")
export class WhatsappContact extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @ManyToOne(() => WhatsappAccount, (account) => account.contacts, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "whatsappAccountId" })
  whatsappAccount: WhatsappAccount;

  @Column({ type: "varchar", nullable: false })
  whatsappAccountId: string;

  /** WhatsApp ID — phone number in international format without '+' */
  @Column({ type: "varchar", nullable: false })
  waId: string;

  @Column({ type: "varchar", nullable: true })
  name: string | null;

  @Column({ type: "text", nullable: true })
  profilePicture: string | null;

  @OneToMany(() => WhatsappChat, (chat) => chat.contact)
  chats: WhatsappChat[];
}
