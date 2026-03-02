import { applyDecorators } from "@nestjs/common";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { NAME_MAX_LENGTH } from "../../constants/field-lengths.constant.js";

interface ValidateNameOptions {
  readonly isOptional?: boolean;
  readonly maxLength?: number;
  readonly messageRequired?: string;
  readonly messageType?: string;
  readonly messageMaxLength?: string;
}

export function ValidateName(options?: ValidateNameOptions): PropertyDecorator {
  const maxLength = options?.maxLength ?? NAME_MAX_LENGTH;

  const decorators: PropertyDecorator[] = [];

  if (options?.isOptional) {
    decorators.push(IsOptional());
  } else {
    decorators.push(
      IsNotEmpty({ message: options?.messageRequired ?? "Nome é obrigatório" }),
    );
  }

  decorators.push(
    IsString({ message: options?.messageType ?? "Nome deve ser um texto" }),
    MaxLength(maxLength, {
      message:
        options?.messageMaxLength ??
        `Nome deve ter no máximo ${maxLength} caracteres`,
    }),
  );

  return applyDecorators(...decorators);
}
