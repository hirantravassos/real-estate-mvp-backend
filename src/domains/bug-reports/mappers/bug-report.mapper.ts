import { DateHelper } from "../../../shared/utils/date.util";
import { AuditLog } from "../../audit-logs/entities/audit-log.entity";
import {
  AdminBugReportAuditEntryDto,
  AdminBugReportDetailDto,
  AdminBugReportListItemDto,
  BugReportReceiptDto,
} from "../dtos/bug-report.dto";
import { BugReport } from "../entities/bug-report.entity";

const EXCERPT_LENGTH = 200;

/** The first block of the id, enough to find the report in the backoffice. */
export const referenceOf = (id: string) => id.substring(0, 8).toUpperCase();

const excerptOf = (text: string | null) => {
  if (!text) return null;
  return text.length > EXCERPT_LENGTH
    ? `${text.substring(0, EXCERPT_LENGTH - 1)}…`
    : text;
};

export class BugReportMapper {
  static toReceiptDto(bugReport: BugReport): BugReportReceiptDto {
    return {
      id: bugReport.id,
      reference: referenceOf(bugReport.id),
      createdAt: DateHelper.formatUtcToIso(bugReport.createdAt),
    };
  }

  static toListItemDto(bugReport: BugReport): AdminBugReportListItemDto {
    return {
      id: bugReport.id,
      reference: referenceOf(bugReport.id),
      createdAt: DateHelper.formatUtcToIso(bugReport.createdAt),
      source: bugReport.source,
      severity: bugReport.severity,
      status: bugReport.status,
      blocking: bugReport.blocking,
      descriptionExcerpt: excerptOf(bugReport.description),
      errorMessage: bugReport.errorMessage,
      pagePath: bugReport.pagePath,
      appVersion: bugReport.appVersion,
      reporter: bugReport.user
        ? {
            id: bugReport.user.id,
            name: bugReport.user.name,
            email: bugReport.user.email,
          }
        : null,
    };
  }

  static toAuditEntryDto(auditLog: AuditLog): AdminBugReportAuditEntryDto {
    return {
      createdAt: DateHelper.formatUtcToIso(auditLog.createdAt),
      action: auditLog.action,
      resourceId: auditLog.resourceId,
      statusCode: auditLog.statusCode,
      outcome: auditLog.outcome,
      detail: auditLog.detail,
    };
  }

  static toDetailDto(
    bugReport: BugReport,
    auditTrail: AuditLog[],
    recentReportsByReporter: number,
  ): AdminBugReportDetailDto {
    return {
      ...BugReportMapper.toListItemDto(bugReport),
      updatedAt: DateHelper.formatUtcToIso(bugReport.updatedAt),
      description: bugReport.description,
      ip: bugReport.ip,
      userAgent: bugReport.userAgent,
      resolutionNote: bugReport.resolutionNote,
      resolvedAt: bugReport.resolvedAt
        ? DateHelper.formatUtcToIso(bugReport.resolvedAt)
        : null,
      telemetry: bugReport.telemetry,
      auditTrail: auditTrail.map((auditLog) =>
        BugReportMapper.toAuditEntryDto(auditLog),
      ),
      recentReportsByReporter,
    };
  }
}
