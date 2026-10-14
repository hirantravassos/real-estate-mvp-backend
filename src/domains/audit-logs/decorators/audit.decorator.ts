import { SetMetadata } from "@nestjs/common";
import { AuditLogScope } from "../entities/audit-log.entity";

export const AUDIT_SCOPE_KEY = "auditScope";
export const SKIP_AUDIT_KEY = "skipAudit";

/**
 * Records every call of the route, reads included, under the scope. Without
 * it only the changes (POST, PUT, PATCH, DELETE) of a signed in broker are
 * recorded.
 */
export const AuditScope = (
  scope: AuditLogScope,
): MethodDecorator & ClassDecorator => SetMetadata(AUDIT_SCOPE_KEY, scope);

/** The route records its own, more detailed, entry. */
export const SkipAudit = (): MethodDecorator & ClassDecorator =>
  SetMetadata(SKIP_AUDIT_KEY, true);
