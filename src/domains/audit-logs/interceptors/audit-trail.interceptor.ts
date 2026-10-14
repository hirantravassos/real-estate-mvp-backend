import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request, Response } from "express";
import { Observable, tap } from "rxjs";
import { readRequestEvidence } from "../../../shared/utils/request-evidence.util";
import { User } from "../../users/entities/user.entity";
import { AUDIT_SCOPE_KEY, SKIP_AUDIT_KEY } from "../decorators/audit.decorator";
import { AuditLogOutcome, AuditLogScope } from "../entities/audit-log.entity";
import { readAuditDetail } from "../helpers/audit-detail.helper";
import { AuditLogService } from "../services/audit-log.service";

const CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const statusOf = (error: unknown): number =>
  error instanceof HttpException
    ? error.getStatus()
    : HttpStatus.INTERNAL_SERVER_ERROR;

const DENIED_STATUSES = new Set<number>([
  HttpStatus.UNAUTHORIZED,
  HttpStatus.FORBIDDEN,
]);

const outcomeOf = (statusCode: number): AuditLogOutcome => {
  if (DENIED_STATUSES.has(statusCode)) return AuditLogOutcome.DENIED;
  return statusCode >= 400 ? AuditLogOutcome.FAILURE : AuditLogOutcome.SUCCESS;
};

/** The route pattern, never the raw URL: ids go apart, queries never. */
const actionOf = (request: Request): string => {
  const routePath = (request.route as { path?: unknown } | undefined)?.path;
  const path = typeof routePath === "string" ? routePath : "unknown";
  return `${request.method} ${path}`;
};

const resourceIdOf = (request: Request): string | null => {
  const parameters = request.params ?? {};
  const value = parameters.id ?? Object.values(parameters)[0];
  return typeof value === "string" ? value : null;
};

/**
 * Runs after the guards, so the broker is already known. Records every
 * change a signed in broker makes, and every call of the routes marked with
 * an audit scope, reads included. Public routes and webhooks, without a
 * broker, are left out.
 */
@Injectable()
export class AuditTrailInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") return next.handle();

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: User }>();
    const user = request.user;
    if (!user?.id) return next.handle();

    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_KEY, targets)) {
      return next.handle();
    }

    const markedScope = this.reflector.getAllAndOverride<
      AuditLogScope | undefined
    >(AUDIT_SCOPE_KEY, targets);
    if (!markedScope && !CHANGING_METHODS.has(request.method)) {
      return next.handle();
    }

    const write = (statusCode: number) =>
      void this.auditLogService.record({
        userId: user.id,
        scope: markedScope ?? AuditLogScope.USER,
        action: actionOf(request),
        resourceId: resourceIdOf(request),
        statusCode,
        outcome: outcomeOf(statusCode),
        evidence: readRequestEvidence(request),
        detail: readAuditDetail(request),
      });

    const response = context.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      tap({
        complete: () => write(response.statusCode),
        error: (error: unknown) => write(statusOf(error)),
      }),
    );
  }
}
