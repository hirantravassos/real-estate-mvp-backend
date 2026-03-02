import { applyDecorators } from "@nestjs/common";
import { Column } from "typeorm";

interface ColumnDateTimeOptions {
  readonly nullable?: boolean;
  readonly columnName?: string;
  readonly defaultValue?: string;
}

/**
 * Column stored as UTC timestamp.
 * All date-time values should be converted to UTC before persisting
 * using the shared date utility functions.
 */
export function ColumnDateTime(
  options?: ColumnDateTimeOptions,
): PropertyDecorator {
  const nullable = options?.nullable ?? false;

  return applyDecorators(
    Column({
      type: "timestamp",
      nullable,
      ...(options?.columnName ? { name: options.columnName } : {}),
      ...(options?.defaultValue ? { default: options.defaultValue } : {}),
    }),
  );
}
