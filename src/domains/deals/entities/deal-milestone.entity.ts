import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { Deal } from "./deal.entity";

/** A step until the keys, like the bank approval or the registry. */
@Entity("deal_milestones")
export class DealMilestone extends BaseEntity {
  @ManyToOne(() => Deal, (deal) => deal.milestones, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "dealId" })
  deal: Deal;

  @Column({ type: "uuid", nullable: false })
  dealId: string;

  @Column({ type: "varchar", length: 255, nullable: false })
  title: string;

  @Column({ type: "date", nullable: true })
  dueDate: string | null;

  @Column({ type: "datetime", nullable: true })
  completedAt: Date | null;

  @Column({ type: "int", default: 0 })
  sortOrder: number;
}
