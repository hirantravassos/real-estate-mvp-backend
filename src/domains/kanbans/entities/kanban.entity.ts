import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { DatabaseBaseEntity } from "../../../infrastructure/database/entities/database-base.entity";
import { ColumnName } from "../../../shared/decorators/columns/column-name.decorator";
import { User } from "../../users/entities/user.entity";
import { ColumnLongText } from "../../../shared/decorators/columns/column-long-text.decorator";
import { Contact } from "../../contacts/entities/contact.entity";

@Entity("kanbans")
export class Kanban extends DatabaseBaseEntity {
  @ManyToOne(() => User, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @OneToMany(() => Contact, (contact) => contact.kanban)
  contacts: Contact[];

  @ColumnName()
  name: string;

  @ColumnLongText({ nullable: true })
  description: string | null;

  @Column({ type: "int", default: 0 })
  order: number;
}
