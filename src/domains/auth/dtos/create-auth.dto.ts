import { ValidateEmail } from "../../../shared/decorators/validation/email.decorator";
import { ValidateName } from "../../../shared/decorators/validation/name.decorator";
import { ValidateBrazilianPhoneNumber } from "../../../shared/decorators/validation/brazilian-phone-number.decorator";
import { IsOptional, IsString } from "class-validator";

export class CreateAuthDto {
  @ValidateEmail()
  email: string;

  @ValidateName()
  name: string;

  @ValidateBrazilianPhoneNumber()
  phone: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  googleId: string;

  @IsOptional()
  @IsString()
  facebookId: string;
}
