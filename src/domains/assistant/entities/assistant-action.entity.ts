import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import {
  AssistantActionKind,
  AssistantActionStatus,
} from "../enums/assistant.enum";

export interface SendMessagePayload {
  conversationId: string | null;
  customerId: string | null;
  recipientName: string;
  text: string;
}

export interface ScheduleVisitPayload {
  customerId: string;
  customerName: string;
  propertyId: string | null;
  address: string;
  startsAt: string;
  endsAt: string;
  notes: string | null;
}

export interface AddNotePayload {
  customerId: string;
  customerName: string;
  note: string;
}

export interface MoveStagePayload {
  customerId: string;
  customerName: string;
  stageId: string;
  stageName: string;
}

export interface MarkLostPayload {
  customerId: string;
  customerName: string;
  lost: boolean;
}

export interface AssistantActionPayloads {
  [AssistantActionKind.SEND_MESSAGE]: SendMessagePayload;
  [AssistantActionKind.SCHEDULE_VISIT]: ScheduleVisitPayload;
  [AssistantActionKind.ADD_NOTE]: AddNotePayload;
  [AssistantActionKind.MOVE_STAGE]: MoveStagePayload;
  [AssistantActionKind.MARK_LOST]: MarkLostPayload;
}

export type AssistantActionPayload =
  AssistantActionPayloads[AssistantActionKind];

/**
 * Something the assistant prepared on behalf of the broker. Nothing happens
 * until the broker confirms it, so a chat or a customer message can never
 * make the assistant act alone.
 */
@Entity("assistant_actions")
@Index(["userId", "messageId"])
export class AssistantAction extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  /** The assistant answer that proposed it, set once the answer is saved. */
  @Column({ type: "varchar", nullable: true })
  messageId: string | null;

  @Column({ type: "enum", enum: AssistantActionKind, nullable: false })
  kind: AssistantActionKind;

  @Column({
    type: "enum",
    enum: AssistantActionStatus,
    nullable: false,
    default: AssistantActionStatus.PENDING,
  })
  status: AssistantActionStatus;

  @Column({ type: "varchar", length: 255, nullable: false })
  title: string;

  @Column({ type: "json", nullable: false })
  payload: AssistantActionPayload;

  @Column({ type: "varchar", length: 255, nullable: true })
  errorMessage: string | null;

  @Column({ type: "datetime", nullable: true })
  executedAt: Date | null;
}
