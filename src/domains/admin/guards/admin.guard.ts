import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";
import { readRequestEvidence } from "../../../shared/utils/request-evidence.util";
import {
  AuditLogOutcome,
  AuditLogScope,
} from "../../audit-logs/entities/audit-log.entity";
import { AuditLogService } from "../../audit-logs/services/audit-log.service";
import { User } from "../../users/entities/user.entity";
import {
  ADMIN_SESSION_HEADER,
  AdminSessionService,
} from "../services/admin-session.service";

/**
 * Runs after the JwtGuard, on every backoffice call: the account must still
 * be allowlisted and carry a live admin session of its own. Each refusal is
 * audited.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly adminSessionService: AdminSessionService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: User }>();
    const user = request.user;
    const header = request.headers[ADMIN_SESSION_HEADER];
    const sessionToken = typeof header === "string" ? header : null;

    let reason: string | null = null;
    if (!user) {
      reason = "Sem conta logada.";
    } else if (!this.adminSessionService.isAllowedEmail(user.email)) {
      reason = "Email fora da lista de administradores.";
    } else if (!this.adminSessionService.verify(user, sessionToken)) {
      reason = "Sessão de administrador ausente, expirada ou inválida.";
    }
    if (!reason) return true;

    const routePath = (request.route as { path?: unknown } | undefined)?.path;
    await this.auditLogService.record({
      userId: user?.id ?? null,
      scope: AuditLogScope.ADMIN,
      action: `${request.method} ${typeof routePath === "string" ? routePath : "unknown"}`,
      outcome: AuditLogOutcome.DENIED,
      statusCode: HttpStatus.FORBIDDEN,
      evidence: readRequestEvidence(request),
      detail: reason,
    });

    throw new ForbiddenException({
      message: "Confirme o acesso de administrador de novo.",
      code: "admin_session_required",
    });
  }
}
