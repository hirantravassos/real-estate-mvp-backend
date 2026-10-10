import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { WhatsappConnectionStatus } from "../enums/inbox.enum";

/** The broker's WhatsApp number, one Evolution instance per broker. */
@Entity("whatsapp_connections")
export class WhatsappConnection extends BaseEntity {
  @OneToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  /** Unique through the one to one relation above. */
  @Column({ type: "varchar", nullable: false })
  userId: string;

  @Column({ type: "varchar", length: 120, nullable: false, unique: true })
  instanceName: string;

  /** Secret part of the webhook URL, proves the call came from our Evolution. */
  @Column({ type: "varchar", length: 64, nullable: false, select: false })
  webhookToken: string;

  @Column({
    type: "enum",
    enum: WhatsappConnectionStatus,
    nullable: false,
    default: WhatsappConnectionStatus.DISCONNECTED,
  })
  status: WhatsappConnectionStatus;

  @Column({ type: "varchar", length: 30, nullable: true })
  phone: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  profileName: string | null;

  @Column({ type: "text", nullable: true })
  profilePictureUrl: string | null;

  @Column({ type: "mediumtext", nullable: true })
  qrCode: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  pairingCode: string | null;

  @Column({ type: "datetime", nullable: true })
  qrCodeUpdatedAt: Date | null;

  @Column({ type: "datetime", nullable: true })
  connectedAt: Date | null;
}
