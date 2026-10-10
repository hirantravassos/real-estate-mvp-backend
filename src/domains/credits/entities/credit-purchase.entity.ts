import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";

export enum CreditPurchaseStatus {
  PENDING = "pending",
  PAID = "paid",
  EXPIRED = "expired",
  FAILED = "failed",
}

@Entity("credit_purchases")
export class CreditPurchase extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @Column({ type: "varchar", length: 50, nullable: false })
  packageKey: string;

  @Column({ type: "int", nullable: false })
  credits: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: false })
  amountInBrl: string;

  @Column({
    type: "enum",
    enum: CreditPurchaseStatus,
    nullable: false,
    default: CreditPurchaseStatus.PENDING,
  })
  status: CreditPurchaseStatus;

  @Column({ type: "varchar", length: 30, nullable: false })
  provider: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  providerPaymentId: string | null;

  @Column({ type: "text", nullable: true })
  pixCode: string | null;

  @Column({ type: "mediumtext", nullable: true, select: false })
  pixQrCodeBase64: string | null;

  @Column({ type: "datetime", nullable: true })
  expiresAt: Date | null;

  @Column({ type: "datetime", nullable: true })
  paidAt: Date | null;
}
