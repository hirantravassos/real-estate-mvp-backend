import { Column, Entity, OneToMany, OneToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity.js";
import { ColumnName } from "../../../shared/decorators/columns/column-name.decorator.js";
import { ColumnEmail } from "../../../shared/decorators/columns/column-email.decorator.js";
import { Customer } from "../../customers/entities/customer.entity";
import { WhatsappSession } from "../../whatsapp/entities/whatsapp-session.entity";

@Entity("users")
export class User extends BaseEntity {
  @OneToMany(() => Customer, (customer) => customer.user)
  customers: Customer[];

  @OneToOne(() => WhatsappSession, (session) => session.user, {
    nullable: true,
  })
  session: WhatsappSession | null;

  @ColumnEmail({ unique: true })
  email: string;

  @ColumnName()
  name: string;

  @Column({ type: "varchar", length: 1000 })
  googleId: string;
}
