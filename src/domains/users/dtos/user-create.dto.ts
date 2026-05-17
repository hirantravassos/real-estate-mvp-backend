import { ValidateEmail } from "../../../shared/decorators/validation/email.decorator.js";
import { ValidateName } from "../../../shared/decorators/validation/name.decorator.js";
import { ValidateBrazilianPhoneNumber } from "../../../shared/decorators/validation/brazilian-phone-number.decorator";

export class UserCreateDto {
  @ValidateName()
  name: string;

  @ValidateEmail()
  email: string;

  @ValidateBrazilianPhoneNumber()
  phone: string;
}
