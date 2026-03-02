import { applyDecorators } from "@nestjs/common";
import { Column } from "typeorm";
import { EMAIL_MAX_LENGTH } from "../../constants/field-lengths.constant.js";

interface ColumnEmailOptions {
  readonly nullable?: boolean;
  readonly maxLength?: number;
  readonly columnName?: string;
  readonly unique?: boolean;
}

export function ColumnEmail(options?: ColumnEmailOptions): PropertyDecorator {
  const length = options?.maxLength ?? EMAIL_MAX_LENGTH;
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
