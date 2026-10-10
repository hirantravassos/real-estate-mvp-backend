import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { Conversation } from "./conversation.entity";
import {
  MessageDirection,
  MessageMediaStatus,
  MessageStatus,
  MessageType,
} from "../enums/inbox.enum";

@Entity("messages")
@Index(["userId", "externalId"], { unique: true })
@Index(["conversationId", "sentAt"])
export class Message extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @ManyToOne(() => Conversation, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "conversationId" })
  conversation: Conversation;

  @Column({ type: "varchar", nullable: false })
  conversationId: string;

  /** WhatsApp's own message id. */
  @Column({ type: "varchar", length: 128, nullable: true })
  externalId: string | null;

  @Column({ type: "enum", enum: MessageDirection, nullable: false })
  direction: MessageDirection;

  @Column({ type: "enum", enum: MessageType, nullable: false })
  type: MessageType;

  @Column({ type: "enum", enum: MessageStatus, nullable: false })
  status: MessageStatus;

  /** Text of the message, or the caption of a media. */
  @Column({ type: "text", nullable: true })
  body: string | null;

  @Column({
    type: "enum",
    enum: MessageMediaStatus,
    nullable: false,
    default: MessageMediaStatus.NONE,
  })
  mediaStatus: MessageMediaStatus;

  @Column({ type: "varchar", length: 512, nullable: true, select: false })
  s3Key: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  mimeType: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  fileName: string | null;

  @Column({ type: "bigint", nullable: true })
  sizeBytes: number | null;

  @Column({ type: "int", nullable: true })
  durationSeconds: number | null;

  /** Small blurred preview WhatsApp sends with images and videos. */
  @Column({ type: "text", nullable: true })
  thumbnailBase64: string | null;

  @Column({ type: "json", nullable: true })
  location: { latitude: number; longitude: number; name?: string } | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  quotedExternalId: string | null;

  @Column({ type: "boolean", nullable: false, default: false })
  aiGenerated: boolean;

  /** Groups the messages of one property presentation. */
  @Column({ type: "varchar", length: 64, nullable: true })
  presentationId: string | null;

  @Column({ type: "varchar", nullable: true })
  propertyId: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  errorMessage: string | null;

  @Column({ type: "datetime", precision: 3, nullable: false })
  sentAt: Date;
}
