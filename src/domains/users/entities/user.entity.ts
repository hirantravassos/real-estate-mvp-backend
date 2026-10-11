import { Column, Entity, OneToMany } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity.js";
import { ColumnName } from "../../../shared/decorators/columns/column-name.decorator.js";
import { ColumnEmail } from "../../../shared/decorators/columns/column-email.decorator.js";
import { Customer } from "../../customers/entities/customer.entity";
import { Visit } from "../../visits/entities/visit.entity";
import { CustomerAvatar } from "../../customers/dtos/customer-avatar.dto";

@Entity("users")
export class User extends BaseEntity {
  @OneToMany(() => Customer, (customer) => customer.user)
  customers: Customer[];

  @OneToMany(() => Visit, (visit) => visit.user)
  visits: Visit[];

  @ColumnEmail({ unique: true })
  email: string;

  @ColumnName()
  name: string;

  @Column({ type: "varchar", length: 1000 })
  googleId: string;

  @Column({ type: "text", nullable: true })
  profileImage: string | null;

  /** The broker's own character, same look options as the customers'. */
  @Column({ type: "json", nullable: true })
  avatar: CustomerAvatar | null;

  /** Version of the Terms of Use and Privacy Policy last accepted. */
  @Column({ type: "varchar", length: 20, nullable: true })
  termsVersion: string | null;

  /** Evidence of the acceptance, kept as proof of consent. */
  @Column({ type: "datetime", nullable: true })
  termsAcceptedAt: Date | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  termsAcceptedIp: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  termsAcceptedUserAgent: string | null;
}
