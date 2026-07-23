import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { IsBoolean, IsOptional } from "class-validator";

export class ContactFilterDto extends PaginationRequestDto {
  @IsBoolean()
  @IsOptional()
  buyers?: boolean;

  @IsBoolean()
  @IsOptional()
  sellers?: boolean;

  @IsBoolean()
  @IsOptional()
  agents?: boolean;
}
