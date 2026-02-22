import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User, MfaToken } from './entities';
import { UserRepository, MfaTokenRepository } from './repositories';
import { JwtStrategy, LocalStrategy } from './strategies';
import {
  RegisterUserUseCase,
  LoginUserUseCase,
  RequestMfaUseCase,
  VerifyMfaUseCase,
  ToggleMfaUseCase,
  RefreshTokenUseCase,
} from './use-cases';
import { AuthController } from './controllers';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, MfaToken]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('auth.jwtSecret'),
        signOptions: {
          expiresIn: `${configService.getOrThrow<number>('auth.jwtExpirationTime')}s`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    UserRepository,
    MfaTokenRepository,
    JwtStrategy,
    LocalStrategy,
    RegisterUserUseCase,
    LoginUserUseCase,
    RequestMfaUseCase,
    VerifyMfaUseCase,
    ToggleMfaUseCase,
    RefreshTokenUseCase,
  ],
  exports: [UserRepository, JwtModule],
})
export class AuthModule { }
