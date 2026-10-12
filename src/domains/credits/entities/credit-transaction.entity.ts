import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";

export enum CreditTransactionKind {
  PURCHASE = "purchase",
  USAGE = "usage",
  BONUS = "bonus",
  GRANT = "grant",
  REFUND = "refund",
  /** Monthly credits included in the paid plan. */
  SUBSCRIPTION = "subscription",
}

@Entity("credit_transactions")
@Index(["userId", "createdAt"])
export class CreditTransaction extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @Column({ type: "enum", enum: CreditTransactionKind, nullable: false })
  kind: CreditTransactionKind;

  /** Positive adds credits, negative spends them. */
  @Column({ type: "int", nullable: false })
  amount: number;

  @Column({ type: "int", nullable: false })
  balanceAfter: number;

  @Column({ type: "varchar", length: 255, nullable: false })
  description: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  feature: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  model: string | null;

  @Column({ type: "int", nullable: true })
  inputTokens: number | null;

  @Column({ type: "int", nullable: true })
  outputTokens: number | null;

  /** What the provider charged us, kept to audit the margin. */
  @Column({ type: "decimal", precision: 14, scale: 8, nullable: true })
  providerCostUsd: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  referenceId: string | null;
}
