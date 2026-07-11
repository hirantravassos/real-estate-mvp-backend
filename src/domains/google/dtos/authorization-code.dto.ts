import { IsString } from "class-validator";

export class AuthorizationCodeDto {
  @IsString()
  authenticationCode: string;
}
