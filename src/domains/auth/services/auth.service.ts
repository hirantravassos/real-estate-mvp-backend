import { OAuth2Client, TokenPayload } from "google-auth-library";
import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { User } from "../../users/entities/user.entity";
import { ConfigService } from "@nestjs/config";
import { UserRepository } from "../../users/repositories/user.repository";
import { UserMapper } from "../../users/mappers/user.mapper";
import { JwtService } from "@nestjs/jwt";
import { TokenDto } from "../dtos/token.dto";
import { AccessTokenDto } from "../dtos/access-token.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Kanban } from "../../kanbans/entities/kanban.entity";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly googleClient: OAuth2Client;
  private readonly googleClientId: string;
  private readonly refreshSecret: string;
  private readonly accessExpirationTime: number;
  private readonly refreshExpirationTime: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    @InjectRepository(Kanban)
    private readonly kanbanRepository: Repository<Kanban>,
  ) {
    const clientId = this.configService
      .get<string>("auth.googleClientId")
      ?.trim();
    const refreshSecret = this.configService.get<string>(
      "auth.jwtRefreshSecret",
    );
    const accessExpiration = this.configService.get<number>(
      "auth.jwtExpirationTime",
    );
    const refreshExpiration = this.configService.get<number>(
      "auth.jwtRefreshExpirationTime",
    );

    if (!clientId) {
      throw new Error("Google Client ID is not defined in the configuration");
    }

    if (!refreshSecret) {
      throw new Error("JWT_REFRESH_SECRET is not defined in the configuration");
    }

    const accessSecret = this.configService.get<string>("jwt.secret");

    if (refreshSecret === accessSecret) {
      throw new Error(
        "JWT_REFRESH_SECRET must differ from JWT_SECRET so the two token kinds are not interchangeable",
      );
    }

    this.googleClientId = clientId;
    this.googleClient = new OAuth2Client(clientId);
    this.refreshSecret = refreshSecret;
    this.accessExpirationTime = accessExpiration ?? 3600;
    this.refreshExpirationTime = refreshExpiration ?? 604800;
  }

  async authenticateWithGoogle(idToken: string): Promise<TokenDto> {
    const payload = await this.verifyGoogleIdToken(idToken);

    const payloadUser = UserMapper.toEntityFromGoogle(payload);
    let user = await this.userRepository.findByEmail(payloadUser.email);

    if (!user) {
      user = await this.userRepository.save(payloadUser);
      await this.onboardNewUser(user);
    } else if (!user.googleId) {
      // Bind the Google subject on the first login of a pre existing account.
      user.googleId = payloadUser.googleId;
      await this.userRepository.save(user);
    } else if (user.googleId !== payloadUser.googleId) {
      throw new UnauthorizedException(
        "This email is linked to a different Google account",
      );
    }

    return this.generateTokens(user);
  }

  /**
   * Only a rejected Google token is a 401. Database or other failures after
   * this point surface as 500 with their own log, so they are not mistaken
   * for a bad credential.
   */
  private async verifyGoogleIdToken(idToken: string): Promise<TokenPayload> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: idToken,
        audience: this.googleClientId,
      });

      const payload: TokenPayload | undefined = ticket.getPayload();

      if (!payload?.email) {
        throw new Error("Google payload has no email");
      }

      if (payload.email_verified !== true) {
        throw new Error("Google email is not verified");
      }

      return payload;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `[AuthService.verifyGoogleIdToken]: Google rejected the token, ${reason}`,
      );
      throw new UnauthorizedException("Invalid Google token");
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<AccessTokenDto> {
    try {
      const payload = this.jwtService.verify<{
        id: string;
        email: string;
        typ?: string;
      }>(refreshToken, {
        secret: this.refreshSecret,
      });

      if (payload.typ !== "refresh") {
        throw new UnauthorizedException("Not a refresh token");
      }

      const user = await this.userRepository.findOneBy({ id: payload.id });

      if (!user) {
        throw new UnauthorizedException("User not found");
      }

      const accessToken = this.jwtService.sign(
        { id: user.id, email: user.email, typ: "access" },
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

    const accessToken = this.jwtService.sign(
      { ...payload, typ: "access" },
      {
        expiresIn: this.accessExpirationTime,
      },
    );

    const refreshToken = this.jwtService.sign(
      { ...payload, typ: "refresh" },
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpirationTime,
      },
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  private async onboardNewUser(user: User): Promise<void> {
    try {
      await this.kanbanRepository.save([
        {
          user,
          name: "Leads",
          active: true,
          order: 0,
        },
        {
          user,
          name: "Atendimento",
          active: true,
          order: 1,
        },
        {
          user,
          name: "Propostas",
          active: true,
          order: 2,
        },
      ]);
    } catch (error) {
      this.logger.error(
        "[AuthService.onboardNewUser]: Error onboarding new user]",
        error,
      );
    }
  }
}
