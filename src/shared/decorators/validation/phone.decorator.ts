import { applyDecorators } from "@nestjs/common";
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from "class-validator";
import { parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * Custom validation decorator that utilizes libphonenumber-js
 * to validate any international phone number from a single string.
 */
function IsInternationalPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isInternationalPhoneNumber",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== "string") {
            return false;
          }

          const phoneNumber = parsePhoneNumberFromString(value);
          return phoneNumber ? phoneNumber.isValid() : false;
        },
      },
    });
  };
}

interface ValidateInternationalPhoneNumberOptions {
  readonly isOptional?: boolean;
  readonly messageRequired?: string;
  readonly messageType?: string;
  readonly messageInvalid?: string;
}

export function ValidatePhone(
  options?: ValidateInternationalPhoneNumberOptions,
): PropertyDecorator {
  const decorators: PropertyDecorator[] = [];

  if (options?.isOptional) {
    decorators.push(IsOptional());
  } else {
    decorators.push(
      IsNotEmpty({
        message: options?.messageRequired ?? "Phone number is required",
      }),
    );
  }

  decorators.push(
    IsString({
      message: options?.messageType ?? "Phone number must be a text",
    }),
    IsInternationalPhoneNumber({
      message: options?.messageInvalid ?? "Invalid international phone number",
    }),
  );

  return applyDecorators(...decorators);
}
