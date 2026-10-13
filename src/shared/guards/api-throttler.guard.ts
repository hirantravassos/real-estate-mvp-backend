import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ThrottlerGuard } from "@nestjs/throttler";

/** Verifies only, never signs: the tracker must not trust a forged token. */
let accessTokenVerifier: JwtService | null = null;

const verifierOf = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  accessTokenVerifier ??= new JwtService({ secret });
  return accessTokenVerifier;
};

const bearerOf = (request: Record<string, any>) => {
  const header = (request.headers as Record<string, unknown> | undefined)
    ?.authorization;
  return typeof header === "string" && header.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : null;
};

/**
 * The global limit counts per broker when the request carries a valid
 * access token, so brokers sharing an office network do not block each
 * other, and per address otherwise. A forged token falls back to the
 * address, so it cannot be used to dodge the limit.
 */
@Injectable()
export class ApiThrottlerGuard extends ThrottlerGuard {
  protected getTracker(request: Record<string, any>): Promise<string> {
    const token = bearerOf(request);
    const verifier = verifierOf();
    if (token && verifier) {
      try {
        const payload = verifier.verify<{ id?: string }>(token);
        if (payload.id) return Promise.resolve(`user:${payload.id}`);
      } catch {
        // Expired or forged, counted by address below.
      }
    }
    return Promise.resolve(`ip:${String(request.ip)}`);
  }
}
