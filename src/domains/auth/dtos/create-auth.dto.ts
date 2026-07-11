import { ValidateEmail } from "../../../shared/decorators/validation/email.decorator";
import { ValidateName } from "../../../shared/decorators/validation/name.decorator";
import { IsOptional, IsString } from "class-validator";
import { ValidatePhone } from "../../../shared/decorators/validation/phone.decorator";

export class CreateAuthDto {
  @ValidateEmail()
  email: string;

  @ValidateName()
  name: string;

  @ValidatePhone()
  phone: string;

  @IsString()
  @IsOptional()
  password: string | null;

  @IsString()
  @IsOptional()
  confirmPassword: string | null;

  @IsOptional()
  @IsString()
  googleId: string;

  @IsOptional()
  @IsString()
  facebookId: string;

  @IsOptional()
  @IsString()
  picture: string;
}
