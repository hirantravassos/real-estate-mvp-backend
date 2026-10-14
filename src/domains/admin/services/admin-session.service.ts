import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { createHash, hkdfSync, timingSafeEqual } from "crypto";
import dayjs from "dayjs";
import {
  adminConfig,
  MINIMUM_ADMIN_ACCESS_KEY_LENGTH,
} from "../../../config/admin.config";
import { DateHelper } from "../../../shared/utils/date.util";
import { RequestEvidence } from "../../../shared/utils/request-evidence.util";
import {
  AuditLogOutcome,
  AuditLogScope,
} from "../../audit-logs/entities/audit-log.entity";
import { AuditLogService } from "../../audit-logs/services/audit-log.service";
import { AuthService } from "../../auth/services/auth.service";
import { User } from "../../users/entities/user.entity";
import { AdminSessionDto } from "../dtos/admin.dto";

export const ADMIN_SESSION_HEADER = "x-admin-session";
export const ADMIN_SESSION_OPEN_ACTION = "admin.session.open";

const ADMIN_SESSION_TOKEN_TYPE = "admin_session";
const SESSION_SECRET_CONTEXT = "admin-session-v1";
const SESSION_ALGORITHM = "HS256";

/** The brute force lockouts look back this far. */
const LOCKOUT_WINDOW_MINUTES = 15;
const MAXIMUM_ATTEMPTS_PER_ACCOUNT = 5;
const MAXIMUM_ATTEMPTS_PER_ADDRESS = 5;
/** Wrong keys or Google confirmations from allowlisted accounts, all of them. */
const MAXIMUM_FAILURES_OVERALL = 20;
/** The Google confirmation must be this recent, an old one is refused. */
const MAXIMUM_GOOGLE_CONFIRMATION_AGE_SECONDS = 300;
const CLOCK_TOLERANCE_SECONDS = 60;

/** One message for every refusal, so it never tells which check failed. */
const DENIED_MESSAGE = "Acesso de administrador negado.";

interface AdminSessionPayload {
  id: string;
  ver: number;
  typ: string;
}

const digestOf = (value: string) => createHash("sha256").update(value).digest();

/**
 * The backoffice door. A session opens only when the three checks pass
 * together: the email of the signed in account is allowlisted, Google just
 * confirmed that same account with a verified email, and the access key is
 * right. Every attempt is audited and the failures lock the door for a while.
 */
@Injectable()
export class AdminSessionService {
  private readonly logger = new Logger(AdminSessionService.name);
  private readonly allowedEmails: Set<string>;
  private readonly accessKeyDigest: Buffer | null;
  private readonly sessionSecret: string | null;
  private readonly sessionSeconds: number;

  constructor(
    @Inject(adminConfig.KEY)
    configuration: ConfigType<typeof adminConfig>,
    configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
    private readonly auditLogService: AuditLogService,
  ) {
    this.allowedEmails = new Set(configuration.allowedEmails);
    this.sessionSeconds = configuration.sessionMinutes * 60;

    const accessKey = configuration.accessKey;
    const jwtSecret = configService.get<string>("jwt.secret");
    const keyStrongEnough = accessKey.length >= MINIMUM_ADMIN_ACCESS_KEY_LENGTH;

    if (!accessKey) {
      this.logger.warn("Backoffice closed: ADMIN_ACCESS_KEY is not set");
    } else if (!keyStrongEnough) {
      this.logger.error(
        `Backoffice closed: ADMIN_ACCESS_KEY must have at least ${MINIMUM_ADMIN_ACCESS_KEY_LENGTH} characters`,
      );
    }
    if (this.allowedEmails.size === 0) {
      this.logger.warn("Backoffice closed: ADMIN_ALLOWED_EMAILS is empty");
    }

    const enabled =
      keyStrongEnough && this.allowedEmails.size > 0 && Boolean(jwtSecret);
    this.accessKeyDigest = enabled ? digestOf(accessKey) : null;
    // Its own secret, derived with a context label: an access token never
    // passes as an admin session, and changing the key ends every session.
    this.sessionSecret =
      enabled && jwtSecret
        ? Buffer.from(
            hkdfSync(
              "sha256",
              jwtSecret,
              digestOf(accessKey),
              SESSION_SECRET_CONTEXT,
              32,
            ),
          ).toString("base64")
        : null;
  }

  get isEnabled(): boolean {
    return this.sessionSecret !== null;
  }

  isAllowedEmail(email: string | null | undefined): boolean {
    if (!this.isEnabled || !email) return false;
    return this.allowedEmails.has(email.trim().toLowerCase());
  }

  async open(
    user: User,
    idToken: string,
    accessKey: string,
    evidence: RequestEvidence,
  ): Promise<AdminSessionDto> {
    const refuse = async (
      outcome: AuditLogOutcome,
      reason: string,
      status = HttpStatus.FORBIDDEN,
    ): Promise<never> => {
      await this.auditLogService.record({
        userId: user.id,
        scope: AuditLogScope.ADMIN,
        action: ADMIN_SESSION_OPEN_ACTION,
        outcome,
        statusCode: status,
        evidence,
        detail: reason,
      });
      if (status === HttpStatus.TOO_MANY_REQUESTS) {
        throw new HttpException(
          {
            message: `Muitas tentativas. Aguarde ${LOCKOUT_WINDOW_MINUTES} minutos para tentar de novo.`,
            code: "admin_locked",
          },
          status,
        );
      }
      throw new ForbiddenException({
        message: DENIED_MESSAGE,
        code: "admin_denied",
      });
    };

    if (!this.isEnabled) {
      return refuse(AuditLogOutcome.DENIED, "Backoffice fechado no servidor.");
    }
    if (await this.isLockedOut(user.id, evidence.ip)) {
      return refuse(
        AuditLogOutcome.DENIED,
        "Bloqueado por excesso de tentativas.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (!this.isAllowedEmail(user.email)) {
      return refuse(
        AuditLogOutcome.DENIED,
        "Email fora da lista de administradores.",
      );
    }

    const identity = await this.authService.readVerifiedGoogleIdentity(idToken);
    if (!identity) {
      return refuse(
        AuditLogOutcome.FAILURE,
        "Google recusou a confirmação ou o email não é verificado.",
      );
    }
    if (
      !user.googleId ||
      identity.sub !== user.googleId ||
      identity.email?.trim().toLowerCase() !== user.email.trim().toLowerCase()
    ) {
      return refuse(
        AuditLogOutcome.FAILURE,
        "Confirmação de uma conta Google diferente da conta logada.",
      );
    }
    if (!this.isRecent(identity.iat)) {
      return refuse(AuditLogOutcome.FAILURE, "Confirmação do Google antiga.");
    }
    if (!this.isAccessKeyValid(accessKey)) {
      return refuse(AuditLogOutcome.FAILURE, "Chave de acesso inválida.");
    }

    const sessionToken = this.jwtService.sign(
      {
        id: user.id,
        ver: user.tokenVersion ?? 0,
        typ: ADMIN_SESSION_TOKEN_TYPE,
      },
      {
        secret: this.sessionSecret as string,
        expiresIn: this.sessionSeconds,
        algorithm: SESSION_ALGORITHM,
      },
    );

    await this.auditLogService.record({
      userId: user.id,
      scope: AuditLogScope.ADMIN,
      action: ADMIN_SESSION_OPEN_ACTION,
      outcome: AuditLogOutcome.SUCCESS,
      statusCode: HttpStatus.CREATED,
      evidence,
      detail: "Sessão de administrador aberta.",
    });

    return {
      sessionToken,
      email: user.email,
      expiresAt: DateHelper.formatUtcToIso(
        dayjs().add(this.sessionSeconds, "second"),
      ),
    };
  }

  /**
   * The session belongs to this very account and to its current sign in: a
   * logout, a new access key or the end of the time kills it.
   */
  verify(user: User, sessionToken: string | null): boolean {
    if (!this.sessionSecret || !sessionToken) return false;
    try {
      const payload = this.jwtService.verify<AdminSessionPayload>(
        sessionToken,
        {
          secret: this.sessionSecret,
          algorithms: [SESSION_ALGORITHM],
        },
      );
      return (
        payload.typ === ADMIN_SESSION_TOKEN_TYPE &&
        payload.id === user.id &&
        payload.ver === (user.tokenVersion ?? 0)
      );
    } catch {
      return false;
    }
  }

  /** Same time for any key, right or wrong, long or short. */
  private isAccessKeyValid(accessKey: string): boolean {
    if (!this.accessKeyDigest || !accessKey) return false;
    return timingSafeEqual(this.accessKeyDigest, digestOf(accessKey.trim()));
  }

  private isRecent(issuedAtSeconds: number | undefined): boolean {
    if (!issuedAtSeconds) return false;
    const ageSeconds = Date.now() / 1000 - issuedAtSeconds;
    return (
      ageSeconds >= -CLOCK_TOLERANCE_SECONDS &&
      ageSeconds <= MAXIMUM_GOOGLE_CONFIRMATION_AGE_SECONDS
    );
  }

  /**
   * Counted from the audit trail, so it holds across restarts and servers.
   * Any refused attempt counts per account and per address. Overall, only
   * the failures of allowlisted accounts count, so somebody outside the
   * list cannot lock the real admins out.
   */
  private async isLockedOut(
    userId: string,
    ip: string | null,
  ): Promise<boolean> {
    const since = dayjs().subtract(LOCKOUT_WINDOW_MINUTES, "minute").toDate();
    const refused = [AuditLogOutcome.FAILURE, AuditLogOutcome.DENIED];
    const [byAccount, byAddress, overall] = await Promise.all([
      this.auditLogService.countRecentAttempts({
        action: ADMIN_SESSION_OPEN_ACTION,
        outcomes: refused,
        since,
        userId,
      }),
      ip
        ? this.auditLogService.countRecentAttempts({
            action: ADMIN_SESSION_OPEN_ACTION,
            outcomes: refused,
            since,
            ip,
          })
        : Promise.resolve(0),
      this.auditLogService.countRecentAttempts({
        action: ADMIN_SESSION_OPEN_ACTION,
        outcomes: [AuditLogOutcome.FAILURE],
        since,
      }),
    ]);
    return (
      byAccount >= MAXIMUM_ATTEMPTS_PER_ACCOUNT ||
      byAddress >= MAXIMUM_ATTEMPTS_PER_ADDRESS ||
      overall >= MAXIMUM_FAILURES_OVERALL
    );
  }
}
