import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../../users/entities/user.entity";
import { RefreshSession } from "../entities/refresh-session.entity";

const REFRESH_TOKEN_PREFIX = "rt1";
const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * How long the token a refresh just replaced still answers. Two tabs
 * refreshing at once, or a reply lost while the phone slept, get the same
 * successor instead of being taken for a stolen copy.
 */
const REPLACED_TOKEN_GRACE_MILLISECONDS = 2 * 60_000;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GENERATION_PATTERN = /^\d{1,9}$/;
const SIGNATURE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

interface ParsedRefreshToken {
  sessionId: string;
  generation: number;
  signature: string;
}

export interface RotatedRefreshSession {
  userId: string;
  tokenVersion: number;
  refreshToken: string;
}

export const isRotatingRefreshToken = (refreshToken: string): boolean =>
  refreshToken.startsWith(`${REFRESH_TOKEN_PREFIX}.`);

const parseRefreshToken = (refreshToken: string): ParsedRefreshToken | null => {
  const [prefix, sessionId, generation, signature, ...rest] =
    refreshToken.split(".");
  if (
    rest.length > 0 ||
    prefix !== REFRESH_TOKEN_PREFIX ||
    !UUID_PATTERN.test(sessionId ?? "") ||
    !GENERATION_PATTERN.test(generation ?? "") ||
    !SIGNATURE_PATTERN.test(signature ?? "")
  ) {
    return null;
  }
  return { sessionId, generation: Number(generation), signature };
};

const earliestOf = (first: Date, second: Date): Date =>
  first.getTime() <= second.getTime() ? first : second;

/**
 * Keeps a device signed in for as long as it keeps coming back: each refresh
 * rotates the token and pushes the idle deadline forward, up to an absolute
 * cap. A replaced token presented after the grace period revokes the session.
 */
@Injectable()
export class RefreshSessionService {
  private readonly logger = new Logger(RefreshSessionService.name);
  private readonly signingSecret: string;
  private readonly idleMilliseconds: number;
  private readonly absoluteMilliseconds: number;

  constructor(
    @InjectRepository(RefreshSession)
    private readonly refreshSessionRepository: Repository<RefreshSession>,
    configService: ConfigService,
  ) {
    const signingSecret = configService.get<string>("auth.jwtRefreshSecret");
    if (!signingSecret) {
      throw new Error("JWT_REFRESH_SECRET is not defined in the configuration");
    }

    const idleDays = configService.get<number>("auth.refreshSessionIdleDays");
    const maximumDays = configService.get<number>(
      "auth.refreshSessionMaximumDays",
    );
    if (!idleDays || idleDays <= 0 || !maximumDays || maximumDays < idleDays) {
      throw new Error(
        "REFRESH_SESSION_IDLE_DAYS must be positive and not above REFRESH_SESSION_MAXIMUM_DAYS",
      );
    }

    this.signingSecret = signingSecret;
    this.idleMilliseconds = idleDays * MILLISECONDS_PER_DAY;
    this.absoluteMilliseconds = maximumDays * MILLISECONDS_PER_DAY;
  }

  /** Opens a session for a new sign in and returns its first refresh token. */
  async open(user: User): Promise<string> {
    await this.pruneEndedSessions(user.id);

    const now = Date.now();
    const absoluteExpiresAt = new Date(now + this.absoluteMilliseconds);
    const session = await this.refreshSessionRepository.save(
      this.refreshSessionRepository.create({
        userId: user.id,
        seed: randomBytes(32).toString("hex"),
        generation: 0,
        rotatedAt: null,
        idleExpiresAt: earliestOf(
          new Date(now + this.idleMilliseconds),
          absoluteExpiresAt,
        ),
        absoluteExpiresAt,
        tokenVersion: user.tokenVersion ?? 0,
      }),
    );

    return this.tokenOf(session, session.generation);
  }

  /**
   * Trades a refresh token for its successor, or null when the token is not
   * one this server issued, the session ended, or the token was replaced
   * long ago (then the session is revoked, someone else holds a copy).
   */
  async rotate(refreshToken: string): Promise<RotatedRefreshSession | null> {
    const parsed = parseRefreshToken(refreshToken);
    if (!parsed) return null;

    let session = await this.refreshSessionRepository.findOneBy({
      id: parsed.sessionId,
      active: true,
    });
    if (!session || !this.signatureMatches(session, parsed)) return null;

    const now = new Date();
    if (
      session.idleExpiresAt.getTime() <= now.getTime() ||
      session.absoluteExpiresAt.getTime() <= now.getTime()
    ) {
      return null;
    }

    if (parsed.generation === session.generation) {
      const nextGeneration = session.generation + 1;
      const idleExpiresAt = earliestOf(
        new Date(now.getTime() + this.idleMilliseconds),
        session.absoluteExpiresAt,
      );
      // Only the request that still sees the current generation rotates it.
      const result = await this.refreshSessionRepository.update(
        { id: session.id, generation: session.generation, active: true },
        { generation: nextGeneration, rotatedAt: now, idleExpiresAt },
      );
      if (result.affected === 1) {
        return this.rotatedOf(session, nextGeneration);
      }

      // A concurrent refresh of the same token won, answer with its successor.
      session = await this.refreshSessionRepository.findOneBy({
        id: session.id,
        active: true,
      });
      if (!session) return null;
    }

    const replacedRecently =
      parsed.generation === session.generation - 1 &&
      session.rotatedAt !== null &&
      now.getTime() - session.rotatedAt.getTime() <=
        REPLACED_TOKEN_GRACE_MILLISECONDS;
    if (replacedRecently) {
      return this.rotatedOf(session, session.generation);
    }

    await this.refreshSessionRepository.update(
      { id: session.id },
      { active: false },
    );
    this.logger.warn(
      `[RefreshSessionService.rotate]: replaced refresh token reused, session ${session.id} of user ${session.userId} revoked`,
    );
    return null;
  }

  /** Ends every session of the user, on every device. */
  async closeAll(userId: string): Promise<void> {
    await this.refreshSessionRepository.delete({ userId });
  }

  private async pruneEndedSessions(userId: string): Promise<void> {
    await this.refreshSessionRepository
      .createQueryBuilder()
      .delete()
      .where(
        "userId = :userId AND (active = false OR idleExpiresAt <= :now OR absoluteExpiresAt <= :now)",
        { userId, now: new Date() },
      )
      .execute();
  }

  private rotatedOf(
    session: RefreshSession,
    generation: number,
  ): RotatedRefreshSession {
    return {
      userId: session.userId,
      tokenVersion: session.tokenVersion,
      refreshToken: this.tokenOf(session, generation),
    };
  }

  private tokenOf(session: RefreshSession, generation: number): string {
    return [
      REFRESH_TOKEN_PREFIX,
      session.id,
      generation,
      this.signatureOf(session, generation),
    ].join(".");
  }

  private signatureOf(session: RefreshSession, generation: number): string {
    return createHmac("sha256", this.signingSecret)
      .update(`${session.id}.${generation}.${session.seed}`)
      .digest("base64url");
  }

  private signatureMatches(
    session: RefreshSession,
    parsed: ParsedRefreshToken,
  ): boolean {
    const expected = Buffer.from(this.signatureOf(session, parsed.generation));
    const presented = Buffer.from(parsed.signature);
    return (
      expected.length === presented.length &&
      timingSafeEqual(expected, presented)
    );
  }
}
