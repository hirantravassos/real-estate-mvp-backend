import { IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ValidateCurrency } from "../../../shared/decorators/validation/currency.decorator";
import { ValidateLongText } from "../../../shared/decorators/validation/long-text.decorator";
import { PropertyCreateCharacteristics } from "./property-create-characteristics.dto";

export class PropertyCreateDto {
  @IsOptional()
  @IsString()
  alias?: string | null;

  @IsString()
  address: string;

  @IsString()
  address2: string;

  @IsOptional()
  @ValidateLongText({ isOptional: true })
  comment?: string | null;

  @ValidateCurrency()
  price: string;

  @IsOptional()
  ownerId?: string | null;

  @ValidateNested()
  @Type(() => PropertyCreateCharacteristics)
  characteristics: PropertyCreateCharacteristics;
}
