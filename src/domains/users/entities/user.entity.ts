import { Column, Entity, OneToMany } from "typeorm";
import { DatabaseBaseEntity } from "../../../infrastructure/database/entities/database-base.entity";
import { ColumnName } from "../../../shared/decorators/columns/column-name.decorator.js";
import { ColumnEmail } from "../../../shared/decorators/columns/column-email.decorator.js";
import { Customer } from "../../customers/entities/customer.entity";
import { ColumnPhone } from "../../../shared/decorators/columns/column-phone.decorator";
import { ColumnBoolean } from "../../../shared/decorators/columns/column-boolean.decorator";
import { ColumnLongText } from "../../../shared/decorators/columns/column-long-text.decorator";

@Entity("users")
export class User extends DatabaseBaseEntity {
  @OneToMany(() => Customer, (customer) => customer.user)
  customers: Customer[];

  @ColumnEmail({ unique: true })
  email: string;

  @ColumnPhone()
  phone: string;

  @ColumnName()
  name: string;

  @ColumnName({ nullable: true })
  password: string | null;

  @Column({ type: "varchar", length: 1000, nullable: true })
  googleId: string | null;

  @Column({ type: "varchar", length: 1000, nullable: true })
  facebookId: string | null;

  @Column({ type: "varchar", length: 1000, nullable: true })
  picture: string | null;

  /**
   * Encrypted (CryptoUtils.encrypt) Google OAuth refresh token, used to mint
   * new access tokens for Google API calls without re-prompting the user.
   */
  @ColumnLongText({ nullable: true })
  googleRefreshToken: string | null;

  @ColumnLongText({ nullable: true })
  googleAccessToken: string | null;

  @Column({ type: "bigint", nullable: true })
  googleAccessTokenExpiresAt: number | null;

  @ColumnBoolean()
  isPhoneValidated: boolean;

  @ColumnBoolean()
  isEmailValidated: boolean;
}
