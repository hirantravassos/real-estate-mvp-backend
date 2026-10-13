import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { readRequestEvidence } from "../../../shared/utils/request-evidence.util";
import { User } from "../../users/entities/user.entity";
import { GoogleLoginDto } from "../dtos/google-login.dto";
import { RefreshTokenDto } from "../dtos/refresh-token.dto";
import { JwtGuard } from "../guards/jwt.guard";
import { AuthService } from "../services/auth.service";

/** Sign in attempts per address and minute, the global limit is looser. */
const SIGN_IN_ATTEMPTS_PER_MINUTE = 20;

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @Throttle({ default: { limit: SIGN_IN_ATTEMPTS_PER_MINUTE, ttl: 60_000 } })
  googleLogin(@Body() dto: GoogleLoginDto, @Req() request: Request) {
    return this.authService.authenticateWithGoogle(
      dto.idToken,
      readRequestEvidence(request),
    );
  }

  @Post("refresh")
  refreshToken(@Body() dto: RefreshTokenDto, @Req() request: Request) {
    return this.authService.refreshAccessToken(
      dto.refreshToken,
      readRequestEvidence(request),
    );
  }

  /** Ends every session of the broker, on every device. */
  @Post("logout")
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@GetUser() user: User, @Req() request: Request): Promise<void> {
    await this.authService.logout(user, readRequestEvidence(request));
  }
}
