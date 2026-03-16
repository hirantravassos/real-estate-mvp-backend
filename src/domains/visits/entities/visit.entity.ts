import { BaseEntity } from "../../../shared/entities/base.entity";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Customer } from "../../customers/entities/customer.entity";

@Entity("visits")
export class Visit extends BaseEntity {
  @ManyToOne(() => User, (user) => user.visits, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @ManyToOne(() => Customer, (customer) => customer.visits, {
    nullable: false,
    onDelete: "CASCADE",
  })
  customer: Customer;

  @Column({ type: "varchar", length: 1000 })
  address: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  reference: string | null;

  @Column({ type: "datetime" })
  startsAt: Date;

  @Column({ type: "datetime" })
  endsAt: Date;
}
