import { IsString, Length } from 'class-validator';

export class VerifyMfaDto {
  @IsString({ message: 'Token MFA é obrigatório' })
  @Length(6, 6, { message: 'Token MFA deve ter exatamente 6 dígitos' })
  readonly token!: string;
}
