import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'E-mail inválido' })
  readonly email!: string;

  @IsString({ message: 'Senha é obrigatória' })
  readonly password!: string;
}
