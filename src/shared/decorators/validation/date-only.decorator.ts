import { applyDecorators } from "@nestjs/common";
import { IsNotEmpty, IsOptional, Matches } from "class-validator";

/** Matches YYYY-MM-DD format */
const DATE_ONLY_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

interface ValidateDateOnlyOptions {
  readonly isOptional?: boolean;
  readonly messageRequired?: string;
  readonly messageInvalid?: string;
}

export function ValidateDateOnly(
  options?: ValidateDateOnlyOptions,
): PropertyDecorator {
  const decorators: PropertyDecorator[] = [];

  if (options?.isOptional) {
    decorators.push(IsOptional());
  } else {
    decorators.push(
      IsNotEmpty({ message: options?.messageRequired ?? "Data é obrigatória" }),
    );
  }

  decorators.push(
    Matches(DATE_ONLY_REGEX, {
      message:
        options?.messageInvalid ?? "Data deve estar no formato AAAA-MM-DD",
    }),
  );

  return applyDecorators(...decorators);
}
