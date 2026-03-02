import { applyDecorators } from "@nestjs/common";
import { Column } from "typeorm";
import { PHONE_MAX_LENGTH } from "../../constants/field-lengths.constant.js";

interface ColumnPhoneOptions {
  readonly nullable?: boolean;
  readonly maxLength?: number;
  readonly columnName?: string;
}

export function ColumnPhone(options?: ColumnPhoneOptions): PropertyDecorator {
  const length = options?.maxLength ?? PHONE_MAX_LENGTH;
  const nullable = options?.nullable ?? false;

  return applyDecorators(
    Column({
      type: "varchar",
      length,
      nullable,
      ...(options?.columnName ? { name: options.columnName } : {}),
    }),
  );
}
