import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { Property } from "../../properties/entities/property.entity";
import { sealedJsonFieldsTransformer } from "../../../shared/utils/data-cipher.util";

export interface PropertyLegalOwner {
  name: string;
  /** CPF or CNPJ, only digits. */
  documentNumber: string;
}

/** What the public portals ask to issue the certificates of a property. */
@Entity("property_legal_profiles")
@Index(["propertyId"], { unique: true })
export class PropertyLegalProfile extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @ManyToOne(() => Property, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "propertyId" })
  property: Property;

  @Column({ type: "varchar", nullable: false })
  propertyId: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  city: string | null;

  /** Two letters, like SP. */
  @Column({ type: "varchar", length: 2, nullable: true })
  state: string | null;

  /** Número da matrícula. */
  @Column({ type: "varchar", length: 40, nullable: true })
  registrationNumber: string | null;

  /** Cartório de registro de imóveis, like 2º RI de Santos. */
  @Column({ type: "varchar", length: 160, nullable: true })
  registryOffice: string | null;

  /** Inscrição imobiliária of the IPTU. */
  @Column({ type: "varchar", length: 60, nullable: true })
  propertyTaxNumber: string | null;

  /** RIP of the SPU, only for land of the Union. */
  @Column({ type: "varchar", length: 30, nullable: true })
  unionPropertyNumber: string | null;

  /** Each owner's CPF or CNPJ is sealed at rest (LGPD art. 46). */
  @Column({
    type: "json",
    nullable: false,
    transformer: sealedJsonFieldsTransformer(["documentNumber"]),
  })
  owners: PropertyLegalOwner[];
}
