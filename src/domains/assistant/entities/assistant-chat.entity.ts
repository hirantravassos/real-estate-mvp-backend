import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";

/** One subject the broker talks about with the assistant, with its own memory. */
@Entity("assistant_chats")
@Index(["userId", "lastMessageAt"])
export class AssistantChat extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @Column({ type: "varchar", length: 120, nullable: false })
  title: string;

  @Column({ type: "datetime", precision: 3, nullable: false })
  lastMessageAt: Date;
}
