import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";

@Entity("credit_wallets")
export class CreditWallet extends BaseEntity {
  @OneToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  /** Unique through the one to one relation above. */
  @Column({ type: "varchar", nullable: false })
  userId: string;

  @Column({ type: "int", nullable: false, default: 0 })
  balance: number;
}
