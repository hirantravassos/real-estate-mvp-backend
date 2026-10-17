import { OAuth2Client, TokenPayload } from "google-auth-library";
import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { User } from "../../users/entities/user.entity";
import { ConfigService } from "@nestjs/config";
import { UserRepository } from "../../users/repositories/user.repository";
import { UserMapper } from "../../users/mappers/user.mapper";
import { JwtService } from "@nestjs/jwt";
import { TokenDto } from "../dtos/token.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Kanban } from "../../kanbans/entities/kanban.entity";
import { Subscription } from "../../subscriptions/entities/subscription.entity";
import { deletedGoogleIdOf } from "../../account-deletions/helpers/deleted-account.helper";
import { AccessLogService } from "../../access-logs/services/access-log.service";
import { AccessLogEvent } from "../../access-logs/entities/access-log.entity";
import { RequestEvidence } from "../../../shared/utils/request-evidence.util";
import { announceSessionsEnded } from "../../../shared/utils/session-events.util";
import { subscriptionsConfig } from "../../../config/subscriptions.config";
import { BrokerMailService } from "../../notifications/services/broker-mail.service";
import { welcomeMail } from "../mails/auth.mails";
import {
  isRotatingRefreshToken,
  RefreshSessionService,
} from "./refresh-session.service";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly googleClient: OAuth2Client;
  private readonly googleClientId: string;
  private readonly refreshSecret: string;
  private readonly accessExpirationTime: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    @InjectRepository(Kanban)
    private readonly kanbanRepository: Repository<Kanban>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly accessLogService: AccessLogService,
    @Inject(subscriptionsConfig.KEY)
    private readonly subscriptionsConfiguration: ConfigType<
      typeof subscriptionsConfig
    >,
    private readonly brokerMailService: BrokerMailService,
    private readonly refreshSessionService: RefreshSessionService,
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
  }

  async authenticateWithGoogle(
    idToken: string,
    evidence: RequestEvidence,
  ): Promise<TokenDto> {
    const payload = await this.verifyGoogleIdToken(idToken);

    const payloadUser = UserMapper.toEntityFromGoogle(payload);
    let user = await this.userRepository.findByEmail(payloadUser.email);

    if (!user) {
      user = await this.userRepository.save(payloadUser);
      await this.onboardNewUser(user);
      const returning = await this.closeTrialOfReturningAccount(user);
      this.brokerMailService.notify(user, (context) =>
        welcomeMail(context, {
          trialDays: this.subscriptionsConfiguration.trialDays,
          trialCredits: this.subscriptionsConfiguration.trialCredits,
          returning,
        }),
      );
    } else if (!user.googleId) {
      // Bind the Google subject on the first login of a pre existing account.
      user.googleId = payloadUser.googleId;
      await this.userRepository.save(user);
    } else if (user.googleId !== payloadUser.googleId) {
      throw new UnauthorizedException(
        "This email is linked to a different Google account",
      );
    }

    await this.accessLogService.record(user.id, AccessLogEvent.LOGIN, evidence);
    return this.generateTokens(user);
  }

  /**
   * Ends every session of the broker on the server: the version goes up and
   * all access and refresh tokens issued before stop working.
   */
  async logout(user: User, evidence: RequestEvidence): Promise<void> {
    await this.userRepository.increment({ id: user.id }, "tokenVersion", 1);
    await this.refreshSessionService.closeAll(user.id);
    announceSessionsEnded(user.id);
    await this.accessLogService.record(
      user.id,
      AccessLogEvent.LOGOUT,
      evidence,
    );
  }

  /**
   * Only a rejected Google token is a 401. Database or other failures after
   * this point surface as 500 with their own log, so they are not mistaken
   * for a bad credential.
   */
  private async verifyGoogleIdToken(idToken: string): Promise<TokenPayload> {
    const payload = await this.readVerifiedGoogleIdentity(idToken);
    if (!payload) throw new UnauthorizedException("Invalid Google token");
    return payload;
  }

  /**
   * The Google identity of the token, or null when Google did not sign it
   * for this app, it has no email or the email is not verified by Google.
   */
  async readVerifiedGoogleIdentity(
    idToken: string,
  ): Promise<TokenPayload | null> {
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
        `[AuthService.readVerifiedGoogleIdentity]: Google rejected the token, ${reason}`,
      );
      return null;
    }
  }

  /**
   * Trades a refresh token for a new access token and the next refresh
   * token. The one presented stops working after a short grace period.
   */
  async refreshAccessToken(
    refreshToken: string,
    evidence: RequestEvidence,
  ): Promise<TokenDto> {
    const rotated = isRotatingRefreshToken(refreshToken)
      ? await this.refreshSessionService.rotate(refreshToken)
      : await this.exchangeLegacyRefreshToken(refreshToken);

    if (!rotated) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const user = await this.userRepository.findOneBy({
      id: rotated.userId,
      active: true,
    });

    if (!user || rotated.tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    await this.accessLogService.record(
      user.id,
      AccessLogEvent.REFRESH,
      evidence,
    );
    return {
      accessToken: this.signAccessToken(user),
      refreshToken: rotated.refreshToken,
    };
  }

  /**
   * Refresh tokens issued before rotation existed are signed JWTs. A valid
   * one opens a rotating session, so devices signed in before the deploy
   * stay signed in. They all expire on their own within seven days of the
   * deploy, then this path can go.
   */
  private async exchangeLegacyRefreshToken(refreshToken: string): Promise<{
    userId: string;
    tokenVersion: number;
    refreshToken: string;
  } | null> {
    let payload: { id: string; typ?: string; ver?: number };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      return null;
    }

    if (payload.typ !== "refresh") return null;

    const user = await this.userRepository.findOneBy({
      id: payload.id,
      active: true,
    });

    if (!user || (payload.ver ?? 0) !== user.tokenVersion) return null;

    return {
      userId: user.id,
      tokenVersion: user.tokenVersion,
      refreshToken: await this.refreshSessionService.open(user),
    };
  }

  private signAccessToken(user: User): string {
    return this.jwtService.sign(
      {
        id: user.id,
        email: user.email,
        typ: "access",
        ver: user.tokenVersion ?? 0,
      },
      { expiresIn: this.accessExpirationTime },
    );
  }

  private async generateTokens(user: User): Promise<TokenDto> {
    return {
      accessToken: this.signAccessToken(user),
      refreshToken: await this.refreshSessionService.open(user),
    };
  }

  /**
   * A Google account that deleted its broker account already had its free
   * trial and trial credits. The new account starts with the trial over, so
   * deleting and signing up again is not a way to renew them.
   */
  private async closeTrialOfReturningAccount(user: User): Promise<boolean> {
    if (!user.googleId) return false;
    const returning = await this.userRepository.existsBy({
      googleId: deletedGoogleIdOf(user.googleId),
    });
    if (!returning) return false;

    await this.subscriptionRepository.save(
      this.subscriptionRepository.create({
        userId: user.id,
        trialEndsAt: new Date(),
      }),
    );
    return true;
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
