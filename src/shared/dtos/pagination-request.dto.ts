import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";

type SortOrder = "ASC" | "DESC";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MIN_PAGE = 1;
const MIN_LIMIT = 1;

export class PaginationRequestDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Página deve ser um número inteiro" })
  @Min(MIN_PAGE, { message: "Página deve ser no mínimo 1" })
  readonly page: number = DEFAULT_PAGE;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Limite deve ser um número inteiro" })
  @Min(MIN_LIMIT, { message: "Limite deve ser no mínimo 1" })
  @Max(MAX_LIMIT, { message: `Limite deve ser no máximo ${MAX_LIMIT}` })
  readonly limit: number = DEFAULT_LIMIT;

  @IsOptional()
  @IsString({ message: "Busca deve ser um texto" })
  readonly search?: string;

  @IsOptional()
  @IsString({ message: "Campo de ordenação deve ser um texto" })
  readonly sortBy?: string;

  @IsOptional()
  @IsString({ message: "Direção de ordenação deve ser ASC ou DESC" })
  readonly sortOrder?: SortOrder;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
