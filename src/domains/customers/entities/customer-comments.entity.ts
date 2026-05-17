import { Entity, ManyToOne } from "typeorm";
import { DatabaseBaseEntity } from "../../../infrastructure/database/entities/database-base.entity";
import { ColumnLongText } from "../../../shared/decorators/columns/column-long-text.decorator";
import { Customer } from "./customer.entity";

@Entity("customer_comments", {
  orderBy: {
    createdAt: "DESC",
  },
})
export class CustomerComment extends DatabaseBaseEntity {
  @ManyToOne(() => Customer, (customer) => customer.comments, {
    onDelete: "CASCADE",
  })
  customer: Customer;

  @ColumnLongText()
  comment: string;
}
