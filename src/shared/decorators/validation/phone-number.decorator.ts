import { applyDecorators } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";

const BRAZIL_COUNTRY_CODE = "55";

/**
 * How a phone is kept: Brazilian numbers as area code and number
 * ("11912345678"), foreign ones with "+" and the country code, up to the
 * 15 digits E.164 allows ("+351912345678").
 */
export const PHONE_NUMBER_PATTERN = /^(\d{10,11}|\+[1-9]\d{7,14})$/;

/**
 * "(11) 9 1234-5678", "+55 11 91234-5678" and "5511912345678" become
 * "11912345678", "+351 912 345 678" and "00351912345678" become
 * "+351912345678". Anything that is not text is returned as it came.
 */
export const normalizePhoneNumber = <T>(value: T): T | string => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const explicitlyInternational =
    trimmed.startsWith("+") || trimmed.startsWith("00");
  let digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("00")) digits = digits.substring(2);

  const isBrazilianWithCountryCode =
    digits.startsWith(BRAZIL_COUNTRY_CODE) &&
    (digits.length === 12 || digits.length === 13);
  if (isBrazilianWithCountryCode) {
    return digits.substring(BRAZIL_COUNTRY_CODE.length);
  }
  return explicitlyInternational ? `+${digits}` : digits;
};

interface ValidatePhoneNumberOptions {
  readonly isOptional?: boolean;
  readonly messageRequired?: string;
  readonly messageInvalid?: string;
}

/** A Brazilian or foreign phone, normalized by `normalizePhoneNumber`. */
export function ValidatePhoneNumber(
  options?: ValidatePhoneNumberOptions,
): PropertyDecorator {
  const decorators: PropertyDecorator[] = [
    Transform(({ value }: { value: unknown }) => normalizePhoneNumber(value)),
  ];

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
    IsString({ message: "Telefone deve ser um texto" }),
    Matches(PHONE_NUMBER_PATTERN, {
      message:
        options?.messageInvalid ??
        "Número de telefone inválido, use DDD ou o código do país",
    }),
  );

  return applyDecorators(...decorators);
}
