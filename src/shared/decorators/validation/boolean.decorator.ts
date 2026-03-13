import { Transform } from "class-transformer";
import { IsBoolean, ValidationOptions } from "class-validator";

/**
 * Decorator that transforms a query string ("true", "1", "false", "0")
 * into a boolean and validates it.
 */
export function ValidateBoolean(validationOptions?: ValidationOptions) {
  const transformFn = Transform(({ value }) => {
    if (value === "true" || value === "1") {
      return true;
    }
    if (value === "false" || value === "0") {
      return false;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return value;
  });

  return (target: object, propertyKey: string) => {
    transformFn(target, propertyKey);
    IsBoolean(validationOptions)(target, propertyKey);
  };
}
