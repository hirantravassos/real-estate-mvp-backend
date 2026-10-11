import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import {
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
  SubscriptionPlanKey,
} from "../enums/subscription.enum";

/** One charge of the plan, by Pix or card, and the month it paid for. */
@Entity("subscription_payments")
@Index(["userId", "createdAt"])
@Index(["provider", "providerPaymentId"], { unique: true })
export class SubscriptionPayment extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @Column({ type: "varchar", nullable: false })
  subscriptionId: string;

  @Column({ type: "enum", enum: SubscriptionPlanKey, nullable: false })
  planKey: SubscriptionPlanKey;

  @Column({ type: "enum", enum: SubscriptionPaymentMethod, nullable: false })
  method: SubscriptionPaymentMethod;

  @Column({
    type: "enum",
    enum: SubscriptionPaymentStatus,
    nullable: false,
    default: SubscriptionPaymentStatus.PENDING,
  })
  status: SubscriptionPaymentStatus;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: false })
  amountInBrl: string;

  /** Credits of the plan when the charge was made, added once it is paid. */
  @Column({ type: "int", nullable: false })
  credits: number;

  @Column({ type: "varchar", length: 30, nullable: false })
  provider: string;

  /** Mercado Pago payment id. Unique, so the same charge never counts twice. */
  @Column({ type: "varchar", length: 100, nullable: true })
  providerPaymentId: string | null;

  @Column({ type: "text", nullable: true })
  pixCode: string | null;

  @Column({ type: "mediumtext", nullable: true, select: false })
  pixQrCodeBase64: string | null;

  @Column({ type: "datetime", nullable: true })
  expiresAt: Date | null;

  @Column({ type: "datetime", nullable: true })
  periodStart: Date | null;

  @Column({ type: "datetime", nullable: true })
  periodEnd: Date | null;

  @Column({ type: "datetime", nullable: true })
  paidAt: Date | null;
}
