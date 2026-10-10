import { IsEmail, IsInt, IsString, Max, MaxLength, Min } from "class-validator";

export class CreditPurchaseCreateDto {
  @IsString()
  @MaxLength(50)
  packageKey: string;
}

export class CreditGrantDto {
  @IsEmail()
  email: string;

  @IsInt()
  @Min(1)
  @Max(1_000_000)
  credits: number;

  @IsString()
  @MaxLength(200)
  description: string;
}
