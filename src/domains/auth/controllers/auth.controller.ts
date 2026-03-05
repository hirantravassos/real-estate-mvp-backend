import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "../services/auth.service";
import { GoogleLoginDto } from "../dtos/google-login.dto";
import { RefreshTokenDto } from "../dtos/refresh-token.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post("login")
  googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.authenticateWithGoogle(dto.idToken);
  }

  @Post("refresh")
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(dto.refreshToken);
  }
}
