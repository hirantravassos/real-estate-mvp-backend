import { applyDecorators } from "@nestjs/common";
import {
  IsEmail as IsEmailValidator,
  IsNotEmpty,
  IsOptional,
  MaxLength,
} from "class-validator";
import { EMAIL_MAX_LENGTH } from "../../constants/field-lengths.constant.js";

interface ValidateEmailOptions {
  readonly isOptional?: boolean;
  readonly maxLength?: number;
  readonly messageRequired?: string;
  readonly messageInvalid?: string;
  readonly messageMaxLength?: string;
}

export function ValidateEmail(
  options?: ValidateEmailOptions,
): PropertyDecorator {
  const maxLength = options?.maxLength ?? EMAIL_MAX_LENGTH;

  const decorators: PropertyDecorator[] = [];

  if (options?.isOptional) {
    decorators.push(IsOptional());
  } else {
    decorators.push(
      IsNotEmpty({
        message: options?.messageRequired ?? "E-mail é obrigatório",
      }),
    );
  }

  decorators.push(
    IsEmailValidator(
      {},
      { message: options?.messageInvalid ?? "E-mail inválido" },
    ),
    MaxLength(maxLength, {
      message:
        options?.messageMaxLength ??
        `E-mail deve ter no máximo ${maxLength} caracteres`,
    }),
  );

  return applyDecorators(...decorators);
}
