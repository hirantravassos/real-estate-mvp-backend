import { applyDecorators } from "@nestjs/common";
import { IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";

/**
 * Matches Brazilian phone numbers in the following formats:
 * - +55 11 91234-5678
 * - +5511912345678
 * - (11) 91234-5678
 * - (11) 1234-5678
 * - 11912345678
 * - 1112345678
 */
const BRAZILIAN_PHONE_REGEX = /^(\+?55\s?)?(\(?\d{2}\)?\s?)(\d{4,5}-?\d{4})$/;

interface ValidateBrazilianPhoneNumberOptions {
  readonly isOptional?: boolean;
  readonly messageRequired?: string;
  readonly messageType?: string;
  readonly messageInvalid?: string;
}

export function ValidateBrazilianPhoneNumber(
  options?: ValidateBrazilianPhoneNumberOptions,
): PropertyDecorator {
  const decorators: PropertyDecorator[] = [];

  if (options?.isOptional) {
    decorators.push(IsOptional());
  } else {
    decorators.push(
      IsNotEmpty({
        message: options?.messageRequired ?? "Telefone é obrigatório",
      }),
    );
  }

  decorators.push(
    IsString({ message: options?.messageType ?? "Telefone deve ser um texto" }),
    Matches(BRAZILIAN_PHONE_REGEX, {
      message:
        options?.messageInvalid ?? "Número de telefone brasileiro inválido",
    }),
  );

  return applyDecorators(...decorators);
}
