import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from "class-validator";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import {
  BugReportSeverity,
  BugReportSource,
  BugReportStatus,
} from "../enums/bug-report.enum";
import {
  MAXIMUM_SCREENSHOT_DATA_URL_LENGTH,
  SCREENSHOT_DATA_URL_PATTERN,
} from "../helpers/bug-report-screenshot.helper";
import type { BugReportTelemetry } from "../helpers/bug-report-telemetry.helper";

export const MAXIMUM_DESCRIPTION_LENGTH = 4000;
export const MAXIMUM_RESOLUTION_NOTE_LENGTH = 2000;

/**
 * What the broker sends. Owner, severity and status are set by the server,
 * the telemetry is a free object that is sanitized field by field.
 */
export class BugReportCreateDto {
  @IsEnum(BugReportSource)
  readonly source: BugReportSource;

  @IsOptional()
  @IsString()
  @MaxLength(MAXIMUM_DESCRIPTION_LENGTH)
  readonly description?: string;

  @IsOptional()
  @IsBoolean()
  readonly blocking?: boolean;

  @IsOptional()
  @IsObject()
  readonly telemetry?: Record<string, unknown>;

  /** Print of the screen as a jpeg, png or webp data URL. */
  @IsOptional()
  @IsString()
  @MaxLength(MAXIMUM_SCREENSHOT_DATA_URL_LENGTH)
  @Matches(SCREENSHOT_DATA_URL_PATTERN, {
    message: "O print da tela precisa ser uma imagem jpeg, png ou webp",
  })
  readonly screenshot?: string;
}

export interface BugReportReceiptDto {
  id: string;
  /** Short code the broker can quote to the support. */
  reference: string;
  createdAt: string;
}

export class AdminBugReportListQueryDto extends PaginationRequestDto {
  @IsOptional()
  @IsEnum(BugReportStatus)
  readonly status?: BugReportStatus;

  /** Open and in progress together, the default view of the backoffice. */
  @IsOptional()
  @IsIn(["true", "false"])
  readonly unresolved?: "true" | "false";

  @IsOptional()
  @IsEnum(BugReportSeverity)
  readonly severity?: BugReportSeverity;

  @IsOptional()
  @IsEnum(BugReportSource)
  readonly source?: BugReportSource;

  @IsOptional()
  @IsUUID()
  readonly userId?: string;

  /** Part of the description, of the error or of the page. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  readonly search?: string;
}

export class AdminBugReportUpdateDto {
  @IsEnum(BugReportStatus)
  readonly status: BugReportStatus;

  @IsOptional()
  @IsString()
  @MaxLength(MAXIMUM_RESOLUTION_NOTE_LENGTH)
  readonly resolutionNote?: string;
}

export interface AdminBugReportReporterDto {
  id: string;
  name: string;
  email: string;
}

export interface AdminBugReportListItemDto {
  id: string;
  reference: string;
  createdAt: string;
  source: BugReportSource;
  severity: BugReportSeverity;
  status: BugReportStatus;
  blocking: boolean;
  descriptionExcerpt: string | null;
  errorMessage: string | null;
  pagePath: string | null;
  appVersion: string | null;
  hasScreenshot: boolean;
  reporter: AdminBugReportReporterDto | null;
}

export interface AdminBugReportAuditEntryDto {
  createdAt: string;
  action: string;
  resourceId: string | null;
  statusCode: number | null;
  outcome: string;
  detail: string | null;
}

export interface AdminBugReportDetailDto extends AdminBugReportListItemDto {
  updatedAt: string;
  description: string | null;
  ip: string | null;
  userAgent: string | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  telemetry: BugReportTelemetry | null;
  /** What the server recorded for the broker around the report. */
  auditTrail: AdminBugReportAuditEntryDto[];
  /** Other reports of the same broker in the last 30 days. */
  recentReportsByReporter: number;
}

export interface AdminBugReportSummaryDto {
  open: number;
  inProgress: number;
  criticalUnresolved: number;
  highUnresolved: number;
  newLast24Hours: number;
  resolvedLast24Hours: number;
  oldestUnresolvedAt: string | null;
}
