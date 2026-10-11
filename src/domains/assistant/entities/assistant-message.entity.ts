import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { AssistantReferenceType, AssistantRole } from "../enums/assistant.enum";

/** A record the assistant looked at, so follow ups can point to it. */
export interface AssistantReference {
  type: AssistantReferenceType;
  id: string;
  label: string;
}

/** One line of the broker's chat with the assistant. */
@Entity("assistant_messages")
@Index(["userId", "sentAt"])
export class AssistantMessage extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @Column({ type: "enum", enum: AssistantRole, nullable: false })
  role: AssistantRole;

  @Column({ type: "text", nullable: false })
  content: string;

  /** The broker spoke instead of typing, the content is the transcription. */
  @Column({ type: "boolean", nullable: false, default: false })
  fromVoice: boolean;

  @Column({ type: "int", nullable: false, default: 0 })
  creditsCharged: number;

  @Column({ type: "json", nullable: true })
  references: AssistantReference[] | null;

  /** With milliseconds, so a question always comes before its answer. */
  @Column({ type: "datetime", precision: 3, nullable: false })
  sentAt: Date;
}
