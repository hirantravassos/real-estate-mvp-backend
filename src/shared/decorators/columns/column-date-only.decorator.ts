import { applyDecorators } from "@nestjs/common";
import { Column } from "typeorm";

interface ColumnDateOnlyOptions {
  readonly nullable?: boolean;
  readonly columnName?: string;
}

/**
 * Column stored as a date without time component (YYYY-MM-DD).
 * No timezone conversion is applied to date-only values.
 */
export function ColumnDateOnly(
  options?: ColumnDateOnlyOptions,
): PropertyDecorator {
  const nullable = options?.nullable ?? false;

  return applyDecorators(
    Column({
      type: "date",
      nullable,
      ...(options?.columnName ? { name: options.columnName } : {}),
    }),
  );
}
