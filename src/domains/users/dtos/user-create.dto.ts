import { ValidateEmail } from "../../../shared/decorators/validation/email.decorator.js";
import { ValidateName } from "../../../shared/decorators/validation/name.decorator.js";
import { IsOptional, IsString, MinLength } from "class-validator";

export class UserCreateDto {
  @ValidateName()
  name: string;

  @ValidateEmail()
  email: string;
}
