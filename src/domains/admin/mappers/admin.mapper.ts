import { DateHelper } from "../../../shared/utils/date.util";
import { AuditLog } from "../../audit-logs/entities/audit-log.entity";
import { User } from "../../users/entities/user.entity";
import { AdminAuditLogDto, AdminUserDto } from "../dtos/admin.dto";

export class AdminMapper {
  static toUserDto(user: User, lastAccessAt: Date | null): AdminUserDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      city: user.city ?? null,
      creci: user.creci ?? null,
      profileImage: user.profileImage ?? null,
      createdAt: DateHelper.formatUtcToIso(user.createdAt),
      lastAccessAt: lastAccessAt
        ? DateHelper.formatUtcToIso(lastAccessAt)
        : null,
    };
  }

  static toAuditLogDto(auditLog: AuditLog): AdminAuditLogDto {
    return {
      id: auditLog.id,
      createdAt: DateHelper.formatUtcToIso(auditLog.createdAt),
      scope: auditLog.scope,
      action: auditLog.action,
      resourceId: auditLog.resourceId,
      statusCode: auditLog.statusCode,
      outcome: auditLog.outcome,
      ip: auditLog.ip,
      userAgent: auditLog.userAgent,
      detail: auditLog.detail,
      user: auditLog.user
        ? {
            id: auditLog.user.id,
            name: auditLog.user.name,
            email: auditLog.user.email,
          }
        : null,
    };
  }
}
