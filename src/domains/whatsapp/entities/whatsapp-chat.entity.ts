import { Column, Entity, JoinColumn, ManyToOne, Unique } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";

@Entity("whatsapp_chats")
@Unique(["user", "jid"])
export class WhatsappChat extends BaseEntity {
    @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
    @JoinColumn()
    user: User;

    @Column({ type: "varchar", length: 255 })
    jid: string;

    @Column({ type: "int", default: 0 })
    unreadCount: number;

    @Column({ type: "timestamp", nullable: true })
    lastMessageTimestamp: Date | null;
}
