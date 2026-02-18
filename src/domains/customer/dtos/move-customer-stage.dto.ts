import { IsString, IsInt, Min } from 'class-validator';

export class MoveCustomerStageDto {
  @IsString({ message: 'ID da seção de destino é obrigatório' })
  readonly targetSectionId!: string;

  @IsInt({ message: 'Posição deve ser um número inteiro' })
  @Min(0, { message: 'Posição não pode ser negativa' })
  readonly targetOrder!: number;
}
