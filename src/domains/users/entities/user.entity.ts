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

  /** Address of the broker's public page, like /corretor/maria-souza. */
  @Column({ type: "varchar", length: 60, nullable: true, unique: true })
  slug: string | null;

  /** Where the broker is based. Required by the app, null for old accounts. */
  @Column({ type: "varchar", length: 120, nullable: true })
  city: string | null;

  /** WhatsApp shown on the public page, digits only. */
  @Column({ type: "varchar", length: 20, nullable: true })
  phone: string | null;

  @Column({ type: "varchar", length: 30, nullable: true })
  creci: string | null;

  /** A short presentation shown on the public page. */
  @Column({ type: "varchar", length: 500, nullable: true })
  bio: string | null;

  @Column({ type: "json", nullable: true })
  workingCities: string[] | null;

  /** What the broker sells: high end, launches, rentals, rural… */
  @Column({ type: "json", nullable: true })
  salesNiches: string[] | null;

  /** The customers the broker likes to serve. Private, only the AI reads it. */
  @Column({ type: "json", nullable: true })
  targetClienteles: string[] | null;

  /**
   * Goes up on every logout. Tokens carry the version they were issued
   * with, so the server refuses every older one at once.
   */
  @Column({ type: "int", nullable: false, default: 0 })
  tokenVersion: number;

  /** Free notes the AI always reads, written and edited by the broker. */
  @Column({ type: "text", nullable: true })
  aiMemory: string | null;
}
