import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { ColumnBoolean } from "../../../shared/decorators/columns/column-boolean.decorator";
import { DealEventActor, DealEventKind } from "../enums/deal.enum";
import { Deal } from "./deal.entity";

/** One line of the sale history, shared with the customer when visible. */
@Entity("deal_events")
export class DealEvent extends BaseEntity {
  @ManyToOne(() => Deal, (deal) => deal.events, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "dealId" })
  deal: Deal;

  @Column({ type: "uuid", nullable: false })
  dealId: string;

  @Column({ type: "enum", enum: DealEventKind, nullable: false })
  kind: DealEventKind;

  @Column({ type: "enum", enum: DealEventActor, nullable: false })
  actor: DealEventActor;

  @Column({ type: "varchar", length: 1000, nullable: false })
  message: string;

  @ColumnBoolean({ default: true })
  visibleToCustomer: boolean;
}
