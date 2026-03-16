import { applyDecorators } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsInt, IsNotEmpty, IsOptional, Min } from "class-validator";

interface ValidateCurrencyOptions {
  readonly isOptional?: boolean;
  readonly minValue?: number;
  readonly maxDecimalPlaces?: number;
  readonly messageRequired?: string;
  readonly messageType?: string;
  readonly messageMin?: string;
}

export function ValidateCurrency(
  options?: ValidateCurrencyOptions,
): PropertyDecorator {
  const minValue = options?.minValue ?? 0;

  const decorators: PropertyDecorator[] = [];

  decorators.push(
    Transform(({ value }) => {
      if (typeof value === "string") {
        const parsed = Math.round(parseFloat(value) * 1);
        return isNaN(parsed) ? value : parsed;
      }
      return value as number;
    }),
  );

  if (options?.isOptional) {
    decorators.push(IsOptional());
  } else {
    decorators.push(
      IsNotEmpty({
        message: options?.messageRequired ?? "Valor é obrigatório",
      }),
    );
  }

  decorators.push(
    IsInt({
      message:
        options?.messageType ?? "Valor deve ser um número inteiro (centavos)",
    }),
    Min(minValue, {
      message:
        options?.messageMin ?? `Valor não pode ser menor que ${minValue}`,
    }),
  );

  return applyDecorators(...decorators);
}
