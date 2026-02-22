import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities';
import { LoginResponseDto } from '../dtos';
import { UserMapper } from '../mappers';

@Injectable()
export class LoginUserUseCase {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

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
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: `${this.configService.getOrThrow<number>('auth.jwtRefreshExpirationTime')}s`,
    });

    return {
      accessToken,
      refreshToken,
      requiresMfa: false,
      user: UserMapper.toResponseDto(user),
    };
  }
}
