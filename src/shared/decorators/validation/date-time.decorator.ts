import { applyDecorators } from "@nestjs/common";
import { IsISO8601, IsNotEmpty, IsOptional } from "class-validator";

interface ValidateDateTimeOptions {
  readonly isOptional?: boolean;
  readonly messageRequired?: string;
  readonly messageInvalid?: string;
}

export function ValidateDateTime(
  options?: ValidateDateTimeOptions,
): PropertyDecorator {
  const decorators: PropertyDecorator[] = [];

  if (options?.isOptional) {
    decorators.push(IsOptional());
  } else {
    decorators.push(
      IsNotEmpty({
        message: options?.messageRequired ?? "Data e hora são obrigatórios",
      }),
    );
  }

  decorators.push(
    IsISO8601(
      { strict: true },
      {
        message:
          options?.messageInvalid ??
          "Data e hora devem estar em formato ISO 8601 válido",
      },
    ),
  );

  return applyDecorators(...decorators);
}
