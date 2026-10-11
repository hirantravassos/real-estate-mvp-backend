import { Column, Entity, Index, JoinColumn, OneToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import {
  SubscriptionPaymentMethod,
  SubscriptionPlanKey,
} from "../enums/subscription.enum";

/**
 * One per broker. The access status is never stored: it is worked out from
 * the trial end, the paid months and the grace days on every read.
 */
@Entity("subscriptions")
export class Subscription extends BaseEntity {
  @OneToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  /** Unique through the one to one relation above. */
  @Column({ type: "varchar", nullable: false })
  userId: string;

  /** Plan of the next charge. The plan in force comes from the paid months. */
  @Column({ type: "enum", enum: SubscriptionPlanKey, nullable: true })
  planKey: SubscriptionPlanKey | null;

  @Column({ type: "enum", enum: SubscriptionPaymentMethod, nullable: true })
  paymentMethod: SubscriptionPaymentMethod | null;

  @Column({ type: "datetime", nullable: false })
  trialEndsAt: Date;

  /** End of the last paid month, the access runs until here. */
  @Column({ type: "datetime", nullable: true })
  paidThrough: Date | null;

  /** Amount the card is charged every month, kept so price changes never touch it. */
  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  cardPriceInBrl: string | null;

  /** Mercado Pago recurring charge of the card. */
  @Index()
  @Column({ type: "varchar", length: 100, nullable: true })
  providerPreapprovalId: string | null;

  @Column({ type: "varchar", length: 30, nullable: true })
  providerPreapprovalStatus: string | null;

  @Column({ type: "datetime", nullable: true })
  cardSubscribedAt: Date | null;

  /** Set when the broker cancels: the paid month runs to the end, no renewal. */
  @Column({ type: "datetime", nullable: true })
  canceledAt: Date | null;

  @Column({ type: "datetime", nullable: true })
  lastPaymentFailedAt: Date | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  lastPaymentFailureReason: string | null;

  /** Last time the card charges were read back from Mercado Pago. */
  @Column({ type: "datetime", nullable: true })
  lastSyncedAt: Date | null;
}
