import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { Customer } from "../../customers/entities/customer.entity";
import { MessageDirection } from "../enums/inbox.enum";

/** One WhatsApp chat between the broker and a contact. */
@Entity("conversations")
@Unique(["userId", "remoteJid"])
@Index(["userId", "lastMessageAt"])
export class Conversation extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @ManyToOne(() => Customer, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "customerId" })
  customer: Customer | null;

  @Column({ type: "varchar", nullable: true })
  customerId: string | null;

  @Column({ type: "varchar", length: 120, nullable: false })
  remoteJid: string;

  /** Digits with the country code, as WhatsApp knows the number. */
  @Column({ type: "varchar", length: 30, nullable: false })
  phone: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  contactName: string | null;

  @Column({ type: "text", nullable: true })
  profilePictureUrl: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  lastMessagePreview: string | null;

  @Column({ type: "datetime", nullable: true })
  lastMessageAt: Date | null;

  @Column({ type: "enum", enum: MessageDirection, nullable: true })
  lastMessageDirection: MessageDirection | null;

  @Column({ type: "int", nullable: false, default: 0 })
  unreadCount: number;

  @Column({ type: "boolean", nullable: false, default: false })
  archived: boolean;

  /**
   * Hidden from the inbox for good, for chats that are not about work.
   * Unlike archived, a new message does not bring it back. Nothing changes
   * on WhatsApp itself.
   */
  @Column({ type: "boolean", nullable: false, default: false })
  hidden: boolean;
}
