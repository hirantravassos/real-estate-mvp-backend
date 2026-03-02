import { applyDecorators } from "@nestjs/common";
import { Column } from "typeorm";
import {
  CURRENCY_PRECISION,
  CURRENCY_SCALE,
} from "../../constants/field-lengths.constant.js";

interface ColumnCurrencyOptions {
  readonly nullable?: boolean;
  readonly precision?: number;
  readonly scale?: number;
  readonly columnName?: string;
  readonly defaultValue?: number;
}

export function ColumnCurrency(
  options?: ColumnCurrencyOptions,
): PropertyDecorator {
  const precision = options?.precision ?? CURRENCY_PRECISION;
  const scale = options?.scale ?? CURRENCY_SCALE;
  const nullable = options?.nullable ?? true;

  return applyDecorators(
    Column({
      type: "decimal",
      precision,
      scale,
      nullable,
      ...(options?.columnName ? { name: options.columnName } : {}),
      ...(options?.defaultValue !== undefined
        ? { default: options.defaultValue }
        : {}),
    }),
  );
}
