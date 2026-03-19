import { Column, Entity, Generated, OneToMany, OneToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity.js";
import { ColumnName } from "../../../shared/decorators/columns/column-name.decorator.js";
import { ColumnEmail } from "../../../shared/decorators/columns/column-email.decorator.js";
import { Customer } from "../../customers/entities/customer.entity";
import { Visit } from "../../visits/entities/visit.entity";
import { WhatsappStatus } from "../../whatsapp/entities/whatsapp-status.entity";
import { StorageFile } from "../../storage/entities/storage-files.entity";

@Entity("users")
export class User extends BaseEntity {
  @OneToOne(() => WhatsappStatus, (whatsappStatus) => whatsappStatus.user)
  whatsappStatus: WhatsappStatus;

  @OneToMany(() => Customer, (customer) => customer.user)
  customers: Customer[];

  @OneToMany(() => Visit, (visit) => visit.user)
  visits: Visit[];

  @OneToMany(() => StorageFile, (file) => file.user)
  files: StorageFile[];

  @ColumnEmail({ unique: true })
  email: string;

  @ColumnName()
  name: string;

  @Column({ type: "varchar", length: 1000 })
  googleId: string;

  @Column({ type: "text", nullable: true })
  profileImage: string | null;

  @Column({ type: "uuid", unique: true })
  @Generated("uuid")
  storageId: string;
}
