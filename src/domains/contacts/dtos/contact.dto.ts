import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class ContactFilterDto extends PaginationRequestDto {
  @IsString()
  @IsOptional()
  search?: string;

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
