import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '../repositories';
import { LoginResponseDto } from '../dtos';
import { UserMapper } from '../mappers';

@Injectable()
export class RefreshTokenUseCase {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly userRepository: UserRepository,
    ) { }

    async execute(refreshToken: string): Promise<LoginResponseDto> {
        try {
            const payload = this.jwtService.verify(refreshToken);
            const user = await this.userRepository.findByEmail(payload.email);

            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            if (user.isMfaEnabled) {
                return {
                    accessToken: '',
                    requiresMfa: true,
                    user: UserMapper.toResponseDto(user),
                };
            }

            const newPayload = { sub: user.id, email: user.email };
            const newAccessToken = this.jwtService.sign(newPayload);
            const newRefreshToken = this.jwtService.sign(newPayload, {
                expiresIn: `${this.configService.getOrThrow<number>('auth.jwtRefreshExpirationTime')}s`,
            });

            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                requiresMfa: false,
                user: UserMapper.toResponseDto(user),
            };
        } catch (e) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }
}
