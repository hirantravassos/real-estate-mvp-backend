import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { ColumnName } from "../../../shared/decorators/columns/column-name.decorator";
import { ColumnPhone } from "../../../shared/decorators/columns/column-phone.decorator";
import { User } from "../../users/entities/user.entity";
import { Kanban } from "../../kanbans/entities/kanban.entity";
import { CustomerComment } from "./customer-comments.entity";
import { Visit } from "../../visits/entities/visit.entity";
import { ColumnCurrency } from "../../../shared/decorators/columns/column-currency.decorator";
import { ColumnBoolean } from "../../../shared/decorators/columns/column-boolean.decorator";
import { CustomerAvatar } from "../dtos/customer-avatar.dto";
import { CustomerRole, DEFAULT_CUSTOMER_ROLES } from "../enums/customer.enum";

@Entity("customers")
@Unique(["userId", "phone"])
export class Customer extends BaseEntity {
  @ManyToOne(() => User, (user) => user.customers, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @ManyToOne(() => Kanban, (kanban) => kanban.customers, {
    nullable: true,
    onDelete: "CASCADE",
  })
  kanban: Kanban | null;

  @OneToMany(
    () => CustomerComment,
    (customerComments) => customerComments.customer,
    { cascade: true },
  )
  comments: CustomerComment[];

  @OneToMany(() => Visit, (visit) => visit.customer)
  visits: Visit[];

  @ColumnName()
  name: string;

  @ColumnPhone()
  phone: string;

  @ColumnCurrency({ nullable: true })
  budget: string | null;

  @ColumnBoolean({ default: false })
  lost: boolean;

  @Column({ type: "json", nullable: true })
  avatar: CustomerAvatar | null;

  /** Buyer, seller, partner broker; a contact may hold more than one. */
  @Column({
    type: "set",
    enum: CustomerRole,
    default: DEFAULT_CUSTOMER_ROLES,
  })
  roles: CustomerRole[];
}
