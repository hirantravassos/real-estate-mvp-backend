import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

export class PropertyLegalOwnerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name: string;

  /** CPF or CNPJ, with or without the dots. */
  @IsString()
  @MaxLength(20)
  documentNumber: string;
}

export class PropertyLegalProfileSaveDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string | null;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  state?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  registrationNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  registryOffice?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  propertyTaxNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  unionPropertyNumber?: string | null;

  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PropertyLegalOwnerDto)
  owners: PropertyLegalOwnerDto[];
}

export class PropertyDocumentLookupRunDto {
  /** Which owner, for the certificates issued per CPF or CNPJ. */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  ownerDocumentNumber?: string | null;
}
