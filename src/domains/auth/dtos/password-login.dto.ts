import { IsString } from "class-validator";
import { ValidateEmail } from "../../../shared/decorators/validation/email.decorator";
import { ValidateBrazilianPhoneNumber } from "../../../shared/decorators/validation/brazilian-phone-number.decorator";

export class PasswordLoginDto {
  @ValidateEmail()
  email: string;

  @ValidateBrazilianPhoneNumber()
  phone: string;

  @IsString()
  password: string;
}
