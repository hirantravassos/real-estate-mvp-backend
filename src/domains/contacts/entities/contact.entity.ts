import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from "typeorm";
import { ColumnName } from "../../../shared/decorators/columns/column-name.decorator";
import { User } from "../../users/entities/user.entity";
import { ColumnPhone } from "../../../shared/decorators/columns/column-phone.decorator";
import { ColumnEmail } from "../../../shared/decorators/columns/column-email.decorator";
import { ColumnCurrency } from "../../../shared/decorators/columns/column-currency.decorator";
import { ColumnBoolean } from "../../../shared/decorators/columns/column-boolean.decorator";
import { DatabaseBaseEntity } from "../../../infrastructure/database/entities/database-base.entity";
import { PropertyCharacteristic } from "../../properties/entities/property-characteristic.entity";
import { Property } from "../../properties/entities/property.entity";
import { Kanban } from "../../kanbans/entities/kanban.entity";

export class ContactBuyer {
  @ColumnBoolean({ default: false })
  isBuyer: boolean;

  @ColumnCurrency()
  minBudget: string;

  @ColumnCurrency()
  maxBudget: string;

  @Column(() => PropertyCharacteristic, { prefix: "preference" })
  preferences: PropertyCharacteristic;
}

export class ContactSeller {
  @ColumnBoolean({ default: false })
  isSeller: boolean;

  @OneToMany(() => Property, (property) => property.owner)
  properties: Property[];
}

export class ContactAgent {
  @ColumnBoolean({ default: false })
  isAgent: boolean;
}

@Entity("contacts")
@Unique(["userId", "phone"])
export class Contact extends DatabaseBaseEntity {
  @Column({ type: "varchar" })
  userId: string;

  @ManyToOne(() => User, (user) => user.contacts, {
    cascade: true,
  })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: true })
  kanbanId: string | null;

  @ManyToOne(() => Kanban, (kanban) => kanban.contacts, {
    cascade: true,
  })
  @JoinColumn({ name: "kanbanId" })
  kanban: Kanban;

  @ColumnName()
  name: string;

  @ColumnPhone()
  phone: string;

  @ColumnEmail({ nullable: true })
  email: string | null;

  @Column(() => ContactBuyer, { prefix: "buyer" })
  buyer: ContactBuyer;

  @Column(() => ContactSeller, { prefix: "seller" })
  seller: ContactSeller;

  @Column(() => ContactAgent, { prefix: "agent" })
  agent: ContactAgent;
}
