import {
  IsString,
  IsOptional,
  MaxLength,
  IsNumber,
  Min,
  Matches,
} from 'class-validator';

/**
 * DTO for creating a customer.
 * To add/remove customer fields, update this DTO and the Customer entity.
 */
export class CreateCustomerDto {
  @IsString({ message: 'Nome é obrigatório' })
  @MaxLength(255, { message: 'Nome deve ter no máximo 255 caracteres' })
  readonly name!: string;

  @IsString({ message: 'Telefone é obrigatório' })
  @Matches(/^(\+?\d{10,13}|\(\d{2}\)\s?\d{4,5}-\d{4})$/, {
    message: 'Telefone inválido',
  })
  readonly phone!: string;

  @IsOptional()
  @IsString()
  readonly comments?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Orçamento deve ser um número' })
  @Min(0, { message: 'Orçamento não pode ser negativo' })
  readonly budget?: number;

  @IsString({ message: 'Seção do kanban é obrigatória' })
  readonly kanbanSectionId!: string;
}
