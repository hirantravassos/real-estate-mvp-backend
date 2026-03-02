import { applyDecorators } from "@nestjs/common";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { LONG_TEXT_MAX_LENGTH } from "../../constants/field-lengths.constant.js";

interface ValidateLongTextOptions {
  readonly isOptional?: boolean;
  readonly maxLength?: number;
  readonly messageRequired?: string;
  readonly messageType?: string;
  readonly messageMaxLength?: string;
}

export function ValidateLongText(
  options?: ValidateLongTextOptions,
): PropertyDecorator {
  const maxLength = options?.maxLength ?? LONG_TEXT_MAX_LENGTH;

  const decorators: PropertyDecorator[] = [];

  if (options?.isOptional) {
    decorators.push(IsOptional());
  } else {
    decorators.push(
      IsNotEmpty({
        message: options?.messageRequired ?? "Texto é obrigatório",
      }),
    );
  }

  decorators.push(
    IsString({ message: options?.messageType ?? "Deve ser um texto" }),
    MaxLength(maxLength, {
      message:
        options?.messageMaxLength ??
        `Texto deve ter no máximo ${maxLength} caracteres`,
    }),
  );

  return applyDecorators(...decorators);
}
