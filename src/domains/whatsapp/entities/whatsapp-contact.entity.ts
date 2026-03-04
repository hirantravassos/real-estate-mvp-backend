import { Column, Entity, ManyToOne, Unique } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { ColumnName } from "../../../shared/decorators/columns/column-name.decorator";

@Entity("whatsapp_contacts")
@Unique(["whatsappId", "user"])
export class WhatsappContact extends BaseEntity {
  @ManyToOne(() => User, {
    nullable: false,
    onDelete: "CASCADE",
  })
  user: User;

  @Column({ type: "varchar", length: 255 })
  whatsappId: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  phoneNumber: string | null;

  @ColumnName()
  name: string;
}
