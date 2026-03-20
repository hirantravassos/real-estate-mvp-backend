import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { PropertyFile } from "../../properties/entities/property-files.entity";
import { PropertyFilePresentation } from "../../properties/entities/property-file-presentation.entity";

@Entity("storage_files")
export class StorageFile extends BaseEntity {
  @ManyToOne(() => User, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @OneToMany(() => PropertyFile, (file) => file.file)
  propertyFiles: PropertyFile[];

  @OneToMany(() => PropertyFilePresentation, (file) => file.file)
  propertyFilePresentations: PropertyFilePresentation[];

  @Column({ type: "int", nullable: false, default: 0, name: "file_size" })
  fileSize: number;

  @Column({ type: "varchar", nullable: false })
  mimetype: string;

  @Column({ type: "varchar", nullable: false })
  key: string;
}
