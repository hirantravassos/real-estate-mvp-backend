import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../entities';
import { LoginResponseDto } from '../dtos';
import { UserMapper } from '../mappers';

@Injectable()
export class LoginUserUseCase {
  constructor(private readonly jwtService: JwtService) {}

  async execute(user: User): Promise<LoginResponseDto> {
    if (user.isMfaEnabled) {
      return {
        accessToken: '',
        requiresMfa: true,
        user: UserMapper.toResponseDto(user),
      };
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      requiresMfa: false,
      user: UserMapper.toResponseDto(user),
    };
  }
}
