import { ValidateName } from "../../../shared/decorators/validation/name.decorator";
import { ValidateBrazilianPhoneNumber } from "../../../shared/decorators/validation/brazilian-phone-number.decorator";
import { ValidateLongText } from "../../../shared/decorators/validation/long-text.decorator";
import { IsOptional, IsUUID } from "class-validator";

export class CustomerCreateDto {
  @ValidateName()
  name: string;

  @ValidateBrazilianPhoneNumber()
  phone: string;

  @IsOptional()
  @IsUUID()
  kanbanId: string | null;

  @ValidateLongText({ isOptional: true })
  comment: string | null;
}
