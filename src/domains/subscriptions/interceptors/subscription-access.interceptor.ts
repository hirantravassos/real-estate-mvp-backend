import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { from, Observable, switchMap } from "rxjs";
import { User } from "../../users/entities/user.entity";
import {
  PLAN_LIMIT_KEY,
  PlanLimitRequirement,
  SKIP_SUBSCRIPTION_CHECK_KEY,
} from "../decorators/subscription.decorator";
import { SubscriptionService } from "../services/subscription.service";

/**
 * Runs after the guards, so the broker is already known: closes the app
 * when the subscription expired and checks the plan limits on creations.
 * Public routes, without a broker, are left alone.
 */
@Injectable()
export class SubscriptionAccessInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") return next.handle();

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: User }>();
    const user = request.user;
    if (!user?.id) return next.handle();

    const targets = [context.getHandler(), context.getClass()];
    if (
      this.reflector.getAllAndOverride<boolean>(
        SKIP_SUBSCRIPTION_CHECK_KEY,
        targets,
      )
    ) {
      return next.handle();
    }

    const limit = this.reflector.getAllAndOverride<
      PlanLimitRequirement | undefined
    >(PLAN_LIMIT_KEY, targets);

    const body = request.body as Record<string, unknown> | undefined;
    const listed = limit?.countBodyList ? body?.[limit.countBodyList] : null;
    const adding = Array.isArray(listed) ? Math.max(1, listed.length) : 1;

    return from(
      this.subscriptionService.assertAccess(
        user.id,
        limit ? { resource: limit.resource, adding } : null,
      ),
    ).pipe(switchMap(() => next.handle()));
  }
}
