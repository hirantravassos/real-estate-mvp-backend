import { Entity, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { ColumnLongText } from "../../../shared/decorators/columns/column-long-text.decorator";
import { Customer } from "./customer.entity";

@Entity("customer_comments", {
  orderBy: {
    createdAt: "DESC",
  },
})
export class CustomerComment extends BaseEntity {
  @ManyToOne(() => Customer, (customer) => customer.comments, {
    onDelete: "CASCADE",
  })
  customer: Customer;

  @ColumnLongText()
  comment: string;
}
