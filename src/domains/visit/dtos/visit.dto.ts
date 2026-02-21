import {
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
  IsNumber,
} from 'class-validator';

export class CreateVisitDto {
  @IsString({ message: 'ID do cliente é obrigatório' })
  readonly customerId!: string;

  @IsString({ message: 'Título é obrigatório' })
  @MaxLength(255, { message: 'Título deve ter no máximo 255 caracteres' })
  readonly title!: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsString({ message: 'Localização é obrigatória' })
  @MaxLength(500, { message: 'Localização deve ter no máximo 500 caracteres' })
  readonly location!: string;

  @IsDateString({}, { message: 'Data/hora de início inválida' })
  readonly scheduledAt!: string;

  @IsDateString({}, { message: 'Data/hora de término inválida' })
  readonly endAt!: string;
}

export class UpdateVisitDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  readonly title?: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly location?: string;

  @IsOptional()
  @IsDateString()
  readonly scheduledAt?: string;

  @IsOptional()
  @IsDateString()
  readonly endAt?: string;

  @IsOptional()
  @IsString()
  readonly feedback?: string;

  @IsOptional()
  @IsNumber()
  readonly rating?: number;
}
