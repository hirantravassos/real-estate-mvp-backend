import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  readonly refreshToken: string;
}
