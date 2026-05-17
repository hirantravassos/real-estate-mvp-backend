import { ValidateName } from "../../../shared/decorators/validation/name.decorator";
import { ValidateBrazilianPhoneNumber } from "../../../shared/decorators/validation/brazilian-phone-number.decorator";

export class PropertyContactCreateDto {
  @ValidateName()
  name: string;

  @ValidateBrazilianPhoneNumber()
  phone: string;
}
