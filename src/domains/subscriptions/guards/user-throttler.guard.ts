import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

/**
 * Counts the attempts per broker, not per IP: behind the proxy every
 * request shares the same address. Use it after JwtGuard.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected getTracker(request: Record<string, any>): Promise<string> {
    const userId = (request.user as { id?: string } | undefined)?.id;
    return Promise.resolve(userId ? `user:${userId}` : `ip:${request.ip}`);
  }
}
