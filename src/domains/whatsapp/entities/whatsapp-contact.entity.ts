import { Column, Entity, JoinColumn, ManyToOne, Unique } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";

@Entity("whatsapp_contacts")
@Unique(["user", "jid"])
export class WhatsappContact extends BaseEntity {
    @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
    @JoinColumn()
    user: User;

    @Column({ type: "varchar", length: 255 })
    jid: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    name: string | null;

    @Column({ type: "varchar", length: 255, nullable: true })
    pushName: string | null;

    @Column({ type: "varchar", length: 1024, nullable: true })
    profilePictureUrl: string | null;
}
