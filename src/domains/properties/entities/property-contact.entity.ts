import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { ColumnPhone } from "../../../shared/decorators/columns/column-phone.decorator";
import { User } from "../../users/entities/user.entity";
import { Property } from "./property.entity";
import { WhatsappChat } from "../../whatsapp/entities/whatsapp-chat.entity";

@Entity("property_contacts")
export class PropertyContact extends BaseEntity {
  @ManyToOne(() => User, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @ManyToOne(
    () => WhatsappChat,
    (whatsappChat) => whatsappChat.propertiesContact,
    {
      createForeignKeyConstraints: false,
    },
  )
  @JoinColumn([
    { name: "userId", referencedColumnName: "userId" },
    { name: "phone", referencedColumnName: "phone" },
  ])
  whatsappChat?: WhatsappChat;

  @ManyToOne(() => Property, (property) => property.contacts, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "propertyId" })
  property: Property;

  @Column({ type: "varchar", nullable: false })
  propertyId: string;

  @Column({ type: "varchar", nullable: true })
  name: string | null;

  @ColumnPhone()
  phone: string;
}
