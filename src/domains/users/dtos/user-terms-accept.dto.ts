import { Equals, IsBoolean, IsString, MaxLength } from "class-validator";

export class UserTermsAcceptDto {
  @IsString()
  @MaxLength(20)
  version: string;

  @IsBoolean()
  @Equals(true, {
    message: "É preciso aceitar os Termos de Uso e a Política de Privacidade",
  })
  accepted: boolean;
}
