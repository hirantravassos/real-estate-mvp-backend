import { applyDecorators } from "@nestjs/common";
import { IsNotEmpty, IsNumber, IsOptional, Min } from "class-validator";
import { CURRENCY_SCALE } from "../../constants/field-lengths.constant.js";

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
  const maxDecimalPlaces = options?.maxDecimalPlaces ?? CURRENCY_SCALE;

  const decorators: PropertyDecorator[] = [];

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
    IsNumber(
      { maxDecimalPlaces },
      {
        message:
          options?.messageType ??
          `Valor deve ser um número com no máximo ${maxDecimalPlaces} casas decimais`,
      },
    ),
    Min(minValue, {
      message:
        options?.messageMin ?? `Valor não pode ser menor que ${minValue}`,
    }),
  );

  return applyDecorators(...decorators);
}
