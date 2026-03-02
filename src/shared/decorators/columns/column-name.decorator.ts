import { applyDecorators } from "@nestjs/common";
import { Column } from "typeorm";
import { NAME_MAX_LENGTH } from "../../constants/field-lengths.constant.js";

interface ColumnNameOptions {
  readonly nullable?: boolean;
  readonly maxLength?: number;
  readonly columnName?: string;
  readonly unique?: boolean;
}

export function ColumnName(options?: ColumnNameOptions): PropertyDecorator {
  const length = options?.maxLength ?? NAME_MAX_LENGTH;
  const nullable = options?.nullable ?? false;

  return applyDecorators(
    Column({
      type: "varchar",
      length,
      nullable,
      ...(options?.columnName ? { name: options.columnName } : {}),
      ...(options?.unique ? { unique: true } : {}),
    }),
  );
}
