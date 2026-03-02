import { applyDecorators } from "@nestjs/common";
import { Column } from "typeorm";

interface ColumnLongTextOptions {
  readonly nullable?: boolean;
  readonly columnName?: string;
}

export function ColumnLongText(
  options?: ColumnLongTextOptions,
): PropertyDecorator {
  const nullable = options?.nullable ?? true;

  return applyDecorators(
    Column({
      type: "text",
      nullable,
      ...(options?.columnName ? { name: options.columnName } : {}),
    }),
  );
}
