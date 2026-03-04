import { Column, Entity, ManyToOne, Unique } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { WhatsappMessageTypeEnum } from "../enums/whatsapp-message-type.enum";

@Entity("whatsapp_messages")
@Unique("UQ_WHATSAPP_MESSAGE_COMPOSITE", ["whatsappId", "messageId", "userId"])
export class WhatsappMessage extends BaseEntity {
  @ManyToOne(() => User, {
    nullable: false,
    createForeignKeyConstraints: false,
  })
  user: User;

  @Column({ type: "varchar", length: 255 })
  userId: string;

  @Column({ type: "varchar", length: 255 })
  whatsappId: string;

  @Column({ type: "varchar", length: 255 })
  messageId: string;

  @Column({ type: "varchar", length: 255 })
  content: string;

  @Column({ type: "enum", enum: WhatsappMessageTypeEnum })
  type: WhatsappMessageTypeEnum;

  @Column({
    type: "boolean",
    default: true,
  })
  me: boolean;

  @Column({ type: "datetime" })
  sentAt: string;
}
