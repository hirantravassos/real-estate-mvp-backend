import { ValidateEmail } from "../../../shared/decorators/validation/email.decorator.js";
import { ValidateName } from "../../../shared/decorators/validation/name.decorator.js";

export class UserCreateDto {
  @ValidateName()
  name: string;

  @ValidateEmail()
  email: string;
}
