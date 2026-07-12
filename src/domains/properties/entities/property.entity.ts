import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { DatabaseBaseEntity } from "../../../infrastructure/database/entities/database-base.entity";
import { User } from "../../users/entities/user.entity";
import { ColumnCurrency } from "../../../shared/decorators/columns/column-currency.decorator";
import { PropertyCharacteristic } from "./property-characteristic.entity";
import { Contact } from "../../contacts/entities/contact.entity";

@Entity("properties")
export class Property extends DatabaseBaseEntity {
  @ManyToOne(() => User, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar" })
  userId: string;

  @ManyToOne(() => Contact, (contact) => contact.seller.properties, {
    cascade: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "ownerId" })
  owner: Contact;

  @Column({ type: "varchar", nullable: true })
  ownerId: string | null;

  @Column({ type: "varchar", nullable: true })
  alias: string | null;

  @Column({ type: "text" })
  address: string;

  @Column({ type: "varchar" })
  address2: string;

  @Column({ type: "text", nullable: true })
  comment: string | null;

  @ColumnCurrency()
  price: string;

  @Column(() => PropertyCharacteristic, { prefix: "info" })
  characteristics: PropertyCharacteristic;
}
