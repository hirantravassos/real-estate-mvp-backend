import {
  IsBoolean,
  IsCurrency,
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  ValidateNested,
} from "class-validator";
import { PropertyCreateCharacteristics } from "../../properties/dtos/property-create-characteristics.dto";
import { Type } from "class-transformer";

class BuyerDto extends PropertyCreateCharacteristics {
  @IsCurrency()
  @IsOptional()
  minBudget: string;

  @IsCurrency()
  @IsOptional()
  maxBudget: string;
}

export class ContactCreateDto {
  @IsString()
  name: string;

  @IsPhoneNumber()
  phone: string;

  @IsEmail()
  @IsOptional()
  email: string | undefined;

  @IsBoolean()
  isBuyer: boolean;

  @IsBoolean()
  isSeller: boolean;

  @IsBoolean()
  isAgent: boolean;

  @ValidateNested()
  @Type(() => BuyerDto)
  buyer: BuyerDto;
}
