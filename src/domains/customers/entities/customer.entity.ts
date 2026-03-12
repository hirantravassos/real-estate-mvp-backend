import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  OneToOne,
  Unique,
} from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { ColumnName } from "../../../shared/decorators/columns/column-name.decorator";
import { ColumnPhone } from "../../../shared/decorators/columns/column-phone.decorator";
import { User } from "../../users/entities/user.entity";
import { Kanban } from "../../kanbans/entities/kanban.entity";
import { CustomerComment } from "./customer-comments.entity";
import { ColumnBoolean } from "../../../shared/decorators/columns/column-boolean.decorator";
import { Visit } from "../../visits/entities/visit.entity";
import { ColumnCurrency } from "../../../shared/decorators/columns/column-currency.decorator";
import { WhatsappChat } from "../../whatsapp/entities/whatsapp-chat.entity";

@Entity("customers")
@Unique(["userId", "phone"])
export class Customer extends BaseEntity {
  @ManyToOne(() => User, (user) => user.customers, {
    nullable: false,
  })
  user: User;

  @OneToOne(() => WhatsappChat, (whatsappChat) => whatsappChat.customer, {
    nullable: true,
  })
  chat: WhatsappChat | null;

  @Column({ type: "varchar", length: 255 })
  userId: string;

  @ManyToOne(() => Kanban, (kanban) => kanban.customers, {
    nullable: true,
  })
  kanban: Kanban | null;

  @OneToMany(
    () => CustomerComment,
    (customerComments) => customerComments.customer,
  )
  comments: CustomerComment[];

  @OneToMany(() => Visit, (visit) => visit.customer)
  visits: Visit[];

  @ColumnName({ nullable: true })
  name: string | null;

  @ColumnPhone()
  phone: string;

  @ColumnCurrency({ nullable: true })
  budget: string | null;

  @ColumnBoolean({ default: false })
  ignored: boolean;

  @ColumnBoolean({ default: true })
  pending: boolean;
}
