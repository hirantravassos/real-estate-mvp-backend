import { ValidateName } from "../../../shared/decorators/validation/name.decorator";
import { ValidateBrazilianPhoneNumber } from "../../../shared/decorators/validation/brazilian-phone-number.decorator";
import { IsOptional, IsUUID } from "class-validator";
import { ValidateCurrency } from "../../../shared/decorators/validation/currency.decorator";
import { ValidateLongText } from "../../../shared/decorators/validation/long-text.decorator";

export class CustomerCreateDto {
  @ValidateName()
  name: string;

  @ValidateBrazilianPhoneNumber()
  phone: string;

  @IsOptional()
  @IsUUID()
  kanbanId: string | null;

  @IsOptional()
  @ValidateCurrency({ isOptional: true })
  budget?: string | null;

  @IsOptional()
  @ValidateLongText({ isOptional: true })
  comment: string | null;
}
