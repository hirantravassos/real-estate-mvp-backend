import { Entity, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { ColumnName } from "../../../shared/decorators/columns/column-name.decorator";
import { User } from "../../users/entities/user.entity";
import { Customer } from "../../customers/entities/customer.entity";
import { ColumnLongText } from "../../../shared/decorators/columns/column-long-text.decorator";

@Entity("kanbans")
export class Kanban extends BaseEntity {
  @ManyToOne(() => User, (user) => user.id, {
    nullable: false,
  })
  user: User;

  @OneToMany(() => Customer, (customer) => customer.kanban)
  customers: Customer[];

  @ColumnName()
  name: string;

  @ColumnLongText({ nullable: true })
  description: string | null;
}
