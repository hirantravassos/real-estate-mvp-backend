import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { WhatsappChat } from "./whatsapp-chat.entity";
import { WhatsappContact } from "./whatsapp-contact.entity";

export enum WhatsappConnectionStatus {
  PENDING = "pending",
  ACTIVE = "active",
  ERROR = "error",
}

@Entity("whatsapp_accounts")
export class WhatsappAccount extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @Column({ type: "varchar", nullable: true })
  facebookUserId: string | null;

  @Column({ type: "text", nullable: true })
  encryptedAccessToken: string | null;

  @Column({ type: "varchar", nullable: true })
  wabaId: string | null;

  @Column({ type: "varchar", nullable: true })
  phoneNumberId: string | null;

  @Column({ type: "varchar", nullable: true })
  displayPhoneNumber: string | null;

  @Column({ type: "varchar", nullable: true })
  verifiedName: string | null;

  @Column({
    type: "enum",
    enum: WhatsappConnectionStatus,
    default: WhatsappConnectionStatus.PENDING,
  })
  connectionStatus: WhatsappConnectionStatus;

  @OneToMany(() => WhatsappContact, (contact) => contact.whatsappAccount, {
    cascade: true,
  })
  contacts: WhatsappContact[];

  @OneToMany(() => WhatsappChat, (chat) => chat.whatsappAccount, {
    cascade: true,
  })
  chats: WhatsappChat[];
}
