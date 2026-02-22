import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Patch,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import * as express from 'express';
import * as SharedDecorators from '../../../shared/decorators/current-user.decorator';
import { Public } from '../../../shared/decorators/public.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import {
  RegisterDto,
  LoginDto,
  VerifyMfaDto,
  RefreshTokenDto,
} from '../dtos';
import type { LoginResponseDto, UserResponseDto } from '../dtos';
import {
  RegisterUserUseCase,
  LoginUserUseCase,
  RequestMfaUseCase,
  VerifyMfaUseCase,
  ToggleMfaUseCase,
  RefreshTokenUseCase,
} from '../use-cases';
import { UserMapper } from '../mappers';
import { UserRepository } from '../repositories';
import { User } from '../entities';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginUser: LoginUserUseCase,
    private readonly requestMfa: RequestMfaUseCase,
    private readonly verifyMfa: VerifyMfaUseCase,
    private readonly toggleMfa: ToggleMfaUseCase,
    private readonly refreshToken: RefreshTokenUseCase,
    private readonly userRepository: UserRepository,
  ) { }

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<UserResponseDto> {
    return this.registerUser.execute(registerDto);
  }

  @Public()
  @UseGuards(AuthGuard('local'))
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Req() request: express.Request): Promise<LoginResponseDto> {
    const user = (request as express.Request & { user: User }).user;
    const result = await this.loginUser.execute(user);

    if (result.requiresMfa) {
      await this.requestMfa.execute(user.id, user.email);
    }

    return result;
  }

  @Public()
  @Post('verify-mfa')
  @HttpCode(HttpStatus.OK)
  async verifyMfaToken(
    @Body() body: VerifyMfaDto & { userId: string },
  ): Promise<LoginResponseDto> {
    return this.verifyMfa.execute(body.userId, body.token);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() body: RefreshTokenDto,
  ): Promise<LoginResponseDto> {
    return this.refreshToken.execute(body.refreshToken);
  }

  @Get('me')
  async getProfile(
    @CurrentUser() user: SharedDecorators.AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const fullUser = await this.userRepository.findById(user.userId);
    if (!fullUser) {
      throw new Error('Usuário não encontrado');
    }
    return UserMapper.toResponseDto(fullUser);
  }

  @Patch('mfa/enable')
  async enableMfa(
    @CurrentUser() user: SharedDecorators.AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.toggleMfa.execute(user.userId, true);
  }

  @Patch('mfa/disable')
  async disableMfa(
    @CurrentUser() user: SharedDecorators.AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.toggleMfa.execute(user.userId, false);
  }
}
