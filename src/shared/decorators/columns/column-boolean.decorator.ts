import { applyDecorators } from "@nestjs/common";
import { Column } from "typeorm";

interface ColumnBooleanOptions {
  readonly nullable?: boolean;
  readonly default?: boolean;
  readonly columnName?: string;
}

export function ColumnBoolean(
  options?: ColumnBooleanOptions,
): PropertyDecorator {
  const isNullable = options?.nullable ?? false;
  const defaultValue = options?.default ?? false;

  return applyDecorators(
    Column({
      type: "boolean",
      nullable: isNullable,
      default: defaultValue,
      ...(options?.columnName ? { name: options.columnName } : {}),
    }),
  );
}
