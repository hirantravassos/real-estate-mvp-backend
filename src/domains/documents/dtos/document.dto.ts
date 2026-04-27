import { IsString, MaxLength, MinLength } from "class-validator";

export class DocumentRenameDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  displayName: string;
}
