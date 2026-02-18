import { IsString, IsOptional, MaxLength, IsHexColor } from 'class-validator';

export class CreateKanbanSectionDto {
  @IsString({ message: 'Nome da seção é obrigatório' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  readonly name!: string;

  @IsOptional()
  @IsHexColor({ message: 'Cor deve ser um hexadecimal válido' })
  readonly color?: string;
}

export class UpdateKanbanSectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly name?: string;

  @IsOptional()
  @IsHexColor()
  readonly color?: string;
}


export class ReorderSectionsDto {
  readonly sectionIds!: string[];
}
