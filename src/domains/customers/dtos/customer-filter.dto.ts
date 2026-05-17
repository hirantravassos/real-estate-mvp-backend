import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { IsOptional, IsString, IsUUID } from "class-validator";
import { ValidateBoolean } from "../../../shared/decorators/validation/boolean.decorator";

export class CustomerFilterDto extends PaginationRequestDto {
  @IsOptional()
  @IsString()
  search: string | null;

  @IsOptional()
  @IsUUID()
  kanban: string | null;

  @IsOptional()
  @ValidateBoolean()
  lost: boolean | null;
}