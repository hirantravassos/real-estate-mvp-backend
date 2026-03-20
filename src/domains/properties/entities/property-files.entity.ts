import { BaseEntity } from "../../../shared/entities/base.entity";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Property } from "./property.entity";
import { StorageFile } from "../../storage/entities/storage.entity";

@Entity("property_files")
export class PropertyFile extends BaseEntity {
  @ManyToOne(() => User, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @ManyToOne(() => Property, (property) => property.files, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "property_id" })
  property: Property;

  @ManyToOne(() => StorageFile, (storage) => storage.propertyFiles, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "file_id" })
  file: StorageFile;

  @Column({ name: "file_id", type: "uuid", nullable: false })
  fileId: string;
}
