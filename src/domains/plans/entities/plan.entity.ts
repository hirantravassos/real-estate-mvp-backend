import { Entity } from "typeorm";
import { DatabaseBaseEntity } from "../../../infrastructure/database/entities/database-base.entity";
import { ColumnName } from "../../../shared/decorators/columns/column-name.decorator";
import { ColumnCurrency } from "../../../shared/decorators/columns/column-currency.decorator";
import { ColumnLongText } from "../../../shared/decorators/columns/column-long-text.decorator";

@Entity("plans", { orderBy: { price: "ASC" } })
export class Plan extends DatabaseBaseEntity {
  @ColumnName()
  name: string;

  @ColumnCurrency()
  price: string;

  @ColumnLongText()
  bulletPoints: string;
}
