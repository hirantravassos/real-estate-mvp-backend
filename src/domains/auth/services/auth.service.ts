import { OAuth2Client, TokenPayload } from "google-auth-library";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { User } from "../../users/entities/user.entity";
import { ConfigService } from "@nestjs/config";
import { UserRepository } from "../../users/repositories/user.repository";
import { UserMapper } from "../../users/mappers/user.mapper";
import { JwtService } from "@nestjs/jwt";
import { TokenDto } from "../dtos/token.dto";
import { AccessTokenDto } from "../dtos/access-token.dto";

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;
  private readonly googleClientId: string;
  private readonly refreshSecret: string;
  private readonly accessExpirationTime: number;
  private readonly refreshExpirationTime: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {
    const clientId = this.configService.get<string>("auth.googleClientId");
    const refreshSecret = this.configService.get<string>("auth.jwtRefreshSecret");
    const accessExpiration = this.configService.get<number>("auth.jwtExpirationTime");
    const refreshExpiration = this.configService.get<number>("auth.jwtRefreshExpirationTime");

    if (!clientId) {
      throw new Error("Google Client ID is not defined in the configuration");
    }

    if (!refreshSecret) {
      throw new Error("JWT_REFRESH_SECRET is not defined in the configuration");
    }

    this.googleClientId = clientId;
    this.googleClient = new OAuth2Client(clientId);
    this.refreshSecret = refreshSecret;
    this.accessExpirationTime = accessExpiration ?? 3600;
    this.refreshExpirationTime = refreshExpiration ?? 604800;
  }

  async authenticateWithGoogle(idToken: string): Promise<TokenDto> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: idToken,
        audience: this.googleClientId,
      });

      const payload: TokenPayload | undefined = ticket.getPayload();

      if (!payload) {
        throw new UnauthorizedException("Invalid Google payload");
      }

      const payloadUser = UserMapper.toEntityFromGoogle(payload);
      let user = await this.userRepository.findByEmail(payloadUser.email);

      if (!user) {
        user = await this.userRepository.save(payloadUser);
      }

      return this.generateTokens(user);
    } catch (error) {
      console.error("Error authenticating with Google:", error);
      throw new UnauthorizedException("Authentication failed, google expired token");
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<AccessTokenDto> {
    try {
      const payload = this.jwtService.verify<{ id: string; email: string }>(refreshToken, {
        secret: this.refreshSecret,
      });

      const user = await this.userRepository.findById(payload.id);

      if (!user) {
        throw new UnauthorizedException("User not found");
      }

      const accessToken = this.jwtService.sign(
        { id: user.id, email: user.email },
        { expiresIn: this.accessExpirationTime },
      );

      return { accessToken };
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }

  private generateTokens(user: User): TokenDto {
    const payload = {
      id: user.id,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.accessExpirationTime,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshExpirationTime,
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
