import { Column, Entity, JoinColumn, ManyToOne, Unique } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";

@Entity("whatsapp_messages")
@Unique(["user", "remoteJid", "messageId"])
export class WhatsappMessage extends BaseEntity {
    @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
    @JoinColumn()
    user: User;

    @Column({ type: "varchar", length: 255 })
    remoteJid: string;

    @Column({ type: "varchar", length: 255 })
    messageId: string;

    @Column({ type: "boolean", default: false })
    fromMe: boolean;

    @Column({ type: "varchar", length: 50, nullable: true })
    type: string | null;

    @Column({ type: "text", nullable: true })
    content: string | null;

    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    timestamp: Date;
}
