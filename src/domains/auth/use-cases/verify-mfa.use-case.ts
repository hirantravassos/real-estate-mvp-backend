import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRepository, MfaTokenRepository } from '../repositories';
import { LoginResponseDto } from '../dtos';
import { UserMapper } from '../mappers';

@Injectable()
export class VerifyMfaUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly mfaTokenRepository: MfaTokenRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(userId: string, token: string): Promise<LoginResponseDto> {
    const mfaToken = await this.mfaTokenRepository.findValidToken(
      userId,
      token,
    );

    if (!mfaToken) {
      throw new UnauthorizedException(
        'Código de verificação inválido ou expirado',
      );
    }

    await this.mfaTokenRepository.markAsUsed(mfaToken.id);

    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
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
