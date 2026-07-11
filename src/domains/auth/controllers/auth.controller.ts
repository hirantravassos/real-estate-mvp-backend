import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "../services/auth.service";
import { GoogleLoginDto } from "../dtos/google-login.dto";
import { RefreshTokenDto } from "../dtos/refresh-token.dto";
import { PasswordLoginDto } from "../dtos/password-login.dto";
import { CreateAuthDto } from "../dtos/create-auth.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() dto: CreateAuthDto) {
    return this.authService.register(dto);
  }

  @Post("login/password")
  passwordLogin(@Body() dto: PasswordLoginDto) {
    return this.authService.authenticateWithPassword(dto);
  }

  @Post("login/google")
  googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.authenticateWithGoogle(dto.authenticationCode);
  }

  @Post("refresh")
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(dto.refreshToken);
  }
}
