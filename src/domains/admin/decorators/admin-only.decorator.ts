import { applyDecorators, UseGuards } from "@nestjs/common";
import { AuditScope } from "../../audit-logs/decorators/audit.decorator";
import { AuditLogScope } from "../../audit-logs/entities/audit-log.entity";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { SkipSubscriptionCheck } from "../../subscriptions/decorators/subscription.decorator";
import { AdminGuard } from "../guards/admin.guard";

/**
 * A backoffice route: signed in, allowlisted, with a live admin session.
 * Every call, reads included, goes to the audit trail. The module of the
 * controller imports AdminModule.
 */
export const AdminOnly = () =>
  applyDecorators(
    UseGuards(JwtGuard, AdminGuard),
    SkipSubscriptionCheck(),
    AuditScope(AuditLogScope.ADMIN),
  );
