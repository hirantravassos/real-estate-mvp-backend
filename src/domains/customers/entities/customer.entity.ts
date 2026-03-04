import { Entity, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { ColumnName } from "../../../shared/decorators/columns/column-name.decorator";
import { ColumnPhone } from "../../../shared/decorators/columns/column-phone.decorator";
import { User } from "../../users/entities/user.entity";
import { Kanban } from "../../kanbans/entities/kanban.entity";
import { CustomerComment } from "./customer-comments.entity";
import { ColumnBoolean } from "../../../shared/decorators/columns/column-boolean.decorator";

@Entity("customers")
export class Customer extends BaseEntity {
  @ManyToOne(() => User, (user) => user.customers, {
    nullable: false,
  })
  user: User;

  @ManyToOne(() => Kanban, (kanban) => kanban.customers, {
    nullable: true,
  })
  kanban: Kanban | null;

  @OneToMany(
    () => CustomerComment,
    (customerComments) => customerComments.customer,
  )
  comments: CustomerComment[];

  @ColumnName()
  name: string;

  @ColumnPhone()
  phone: string;

  @ColumnBoolean({ default: false })
  ignored: boolean;

  @ColumnBoolean({ default: true })
  pending: boolean;
}
