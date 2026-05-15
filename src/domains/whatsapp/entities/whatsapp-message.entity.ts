import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { WhatsappChat } from "./whatsapp-chat.entity";

export enum WhatsappMessageDirection {
  INBOUND = "inbound",
  OUTBOUND = "outbound",
}

export enum WhatsappMessageType {
  TEXT = "text",
  IMAGE = "image",
  AUDIO = "audio",
  VIDEO = "video",
  DOCUMENT = "document",
  LOCATION = "location",
  STICKER = "sticker",
  TEMPLATE = "template",
  UNSUPPORTED = "unsupported",
}

export enum WhatsappMessageStatus {
  PENDING = "pending",
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
  FAILED = "failed",
}

@Entity("whatsapp_messages")
export class WhatsappMessage extends BaseEntity {
  @ManyToOne(() => WhatsappChat, (chat) => chat.messages, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "chatId" })
  chat: WhatsappChat;

  @Column({ type: "varchar", nullable: false })
  chatId: string;

  /** Meta's unique message ID for deduplication */
  @Column({ type: "varchar", nullable: true, unique: true })
  metaMessageId: string | null;

  @Column({
    type: "enum",
    enum: WhatsappMessageDirection,
  })
  direction: WhatsappMessageDirection;

  @Column({
    type: "enum",
    enum: WhatsappMessageType,
    default: WhatsappMessageType.TEXT,
  })
  type: WhatsappMessageType;

  @Column({ type: "text", nullable: true })
  body: string | null;

  @Column({ type: "text", nullable: true })
  mediaUrl: string | null;

  @Column({ type: "varchar", nullable: true })
  mediaType: string | null;

  @Column({ type: "varchar", nullable: true })
  fromNumber: string | null;

  @Column({ type: "varchar", nullable: true })
  toNumber: string | null;

  @Column({
    type: "enum",
    enum: WhatsappMessageStatus,
    default: WhatsappMessageStatus.PENDING,
  })
  status: WhatsappMessageStatus;

  /** Timestamp reported by Meta (when the message was actually sent/received) */
  @Column({ type: "timestamp", nullable: true })
  sentAt: Date | null;
}
