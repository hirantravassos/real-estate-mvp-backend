import { Column, Entity, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { ColumnName } from "../../../shared/decorators/columns/column-name.decorator";
import { User } from "../../users/entities/user.entity";
import { Customer } from "../../customers/entities/customer.entity";
import { ColumnLongText } from "../../../shared/decorators/columns/column-long-text.decorator";

@Entity("kanbans")
export class Kanban extends BaseEntity {
  @ManyToOne(() => User, {
    nullable: false,
  })
  user: User;

  @Column({ type: "varchar", length: 255 })
  userId: string;

  @OneToMany(() => Customer, (customer) => customer.kanban)
  customers: Customer[];

  @ColumnName()
  name: string;

  @ColumnLongText({ nullable: true })
  description: string | null;

  @Column({ type: "int", default: 0 })
  order: number;
}
