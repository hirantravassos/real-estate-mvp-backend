import { randomUUID } from "crypto";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import dayjs from "dayjs";
import { In, LessThan, MoreThanOrEqual, Repository } from "typeorm";
import { StorageService } from "../../../infrastructure/storage/services/storage.service";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";
import { RequestEvidence } from "../../../shared/utils/request-evidence.util";
import { escapeLikePattern } from "../../admin/helpers/like-pattern.helper";
import { AuditLogService } from "../../audit-logs/services/audit-log.service";
import { User } from "../../users/entities/user.entity";
import {
  AdminBugReportDetailDto,
  AdminBugReportListQueryDto,
  AdminBugReportSummaryDto,
  AdminBugReportUpdateDto,
  BugReportCreateDto,
  BugReportReceiptDto,
} from "../dtos/bug-report.dto";
import { BugReport } from "../entities/bug-report.entity";
import {
  BugReportSeverity,
  BugReportStatus,
  CLOSED_BUG_REPORT_STATUSES,
  UNRESOLVED_BUG_REPORT_STATUSES,
} from "../enums/bug-report.enum";
import {
  decodeScreenshot,
  screenshotContentTypeOf,
} from "../helpers/bug-report-screenshot.helper";
import { severityOf } from "../helpers/bug-report-severity.helper";
import {
  leadingErrorOf,
  sanitizeBugReportTelemetry,
  scrubSecrets,
} from "../helpers/bug-report-telemetry.helper";
import { BugReportMapper } from "../mappers/bug-report.mapper";

/** The server side of the story, from a little before the report. */
const AUDIT_TRAIL_MINUTES_BEFORE = 30;
const AUDIT_TRAIL_MINUTES_AFTER = 5;
const AUDIT_TRAIL_LIMIT = 60;
const RECENT_REPORTS_DAYS = 30;
/** Closed reports carry an IP and a device, gone after six months. */
export const CLOSED_BUG_REPORT_RETENTION_MONTHS = 6;
/** Expired reports removed per sweep, with their prints. */
const PURGE_BATCH = 500;

export interface BugReportScreenshotFile {
  buffer: Buffer;
  contentType: string;
  fileName: string;
}

@Injectable()
export class BugReportService {
  private readonly logger = new Logger(BugReportService.name);

  constructor(
    @InjectRepository(BugReport)
    private readonly bugReportRepository: Repository<BugReport>,
    private readonly auditLogService: AuditLogService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Always a new row owned by the signed in broker. Severity and status are
   * decided here, the telemetry is copied field by field.
   */
  async create(
    user: User,
    dto: BugReportCreateDto,
    evidence: RequestEvidence,
  ): Promise<BugReportReceiptDto> {
    const telemetry = sanitizeBugReportTelemetry(dto.telemetry);
    const blocking = dto.blocking === true;
    const description = dto.description
      ? scrubSecrets(dto.description).trim() || null
      : null;

    const bugReport = this.bugReportRepository.create({
      userId: user.id,
      source: dto.source,
      severity: severityOf(dto.source, blocking),
      status: BugReportStatus.OPEN,
      description,
      blocking,
      pagePath: telemetry.page.path,
      appVersion: telemetry.app.version,
      errorMessage: leadingErrorOf(telemetry),
      ip: evidence.ip,
      userAgent: evidence.userAgent,
      screenshotKey: await this.storeScreenshot(user.id, dto.screenshot),
      telemetry,
      resolutionNote: null,
      resolvedAt: null,
    });
    const saved = await this.bugReportRepository.save(bugReport);
    return BugReportMapper.toReceiptDto(saved);
  }

  /** Newest first, so a fresh report is never buried under old ones. */
  async list(query: AdminBugReportListQueryDto) {
    const builder = this.bugReportRepository
      .createQueryBuilder("bugReport")
      .leftJoin("bugReport.user", "reporter")
      .addSelect(["reporter.id", "reporter.name", "reporter.email"])
      .orderBy("bugReport.createdAt", "DESC")
      .skip(query.skip)
      .take(query.limit);

    if (query.status) {
      builder.andWhere("bugReport.status = :status", { status: query.status });
    } else if (query.unresolved === "true") {
      builder.andWhere("bugReport.status IN (:...statuses)", {
        statuses: [...UNRESOLVED_BUG_REPORT_STATUSES],
      });
    }
    if (query.severity) {
      builder.andWhere("bugReport.severity = :severity", {
        severity: query.severity,
      });
    }
    if (query.source) {
      builder.andWhere("bugReport.source = :source", { source: query.source });
    }
    if (query.userId) {
      builder.andWhere("bugReport.userId = :userId", { userId: query.userId });
    }
    const search = query.search?.trim();
    if (search) {
      builder.andWhere(
        "(bugReport.description LIKE :pattern OR bugReport.errorMessage LIKE :pattern OR bugReport.pagePath LIKE :pattern OR bugReport.id LIKE :prefix)",
        {
          pattern: `%${escapeLikePattern(search)}%`,
          prefix: `${escapeLikePattern(search.toLowerCase())}%`,
        },
      );
    }

    const [bugReports, total] = await builder.getManyAndCount();
    return PaginationMapper.toDto(
      [
        bugReports.map((bugReport) => BugReportMapper.toListItemDto(bugReport)),
        total,
      ],
      query,
    );
  }

  async detail(id: string): Promise<AdminBugReportDetailDto> {
    const bugReport = await this.findOrFail(id);
    const reportedAt = dayjs(bugReport.createdAt);

    const [auditTrail, recentReportsByReporter] = await Promise.all([
      this.auditLogService.findForUserBetween(
        bugReport.userId,
        reportedAt.subtract(AUDIT_TRAIL_MINUTES_BEFORE, "minute").toDate(),
        reportedAt.add(AUDIT_TRAIL_MINUTES_AFTER, "minute").toDate(),
        AUDIT_TRAIL_LIMIT,
      ),
      this.bugReportRepository.countBy({
        userId: bugReport.userId,
        createdAt: MoreThanOrEqual(
          reportedAt.subtract(RECENT_REPORTS_DAYS, "day").toDate(),
        ),
      }),
    ]);

    return BugReportMapper.toDetailDto(
      bugReport,
      auditTrail.reverse(),
      Math.max(0, recentReportsByReporter - 1),
    );
  }

  /** Loads the row first, a missing id is a 404 and nothing is written. */
  async update(
    id: string,
    dto: AdminBugReportUpdateDto,
  ): Promise<AdminBugReportDetailDto> {
    const bugReport = await this.findOrFail(id);
    const closing = (CLOSED_BUG_REPORT_STATUSES as readonly string[]).includes(
      dto.status,
    );

    bugReport.status = dto.status;
    bugReport.resolvedAt = closing
      ? (bugReport.resolvedAt ?? new Date())
      : null;
    if (dto.resolutionNote !== undefined) {
      bugReport.resolutionNote = dto.resolutionNote.trim() || null;
    }
    await this.bugReportRepository.save(bugReport);
    return this.detail(id);
  }

  async summary(now = new Date()): Promise<AdminBugReportSummaryDto> {
    const dayAgo = dayjs(now).subtract(24, "hour").toDate();
    const unresolved = In([...UNRESOLVED_BUG_REPORT_STATUSES]);

    const [
      open,
      inProgress,
      criticalUnresolved,
      highUnresolved,
      newLast24Hours,
      resolvedLast24Hours,
      oldestUnresolved,
    ] = await Promise.all([
      this.bugReportRepository.countBy({ status: BugReportStatus.OPEN }),
      this.bugReportRepository.countBy({ status: BugReportStatus.IN_PROGRESS }),
      this.bugReportRepository.countBy({
        status: unresolved,
        severity: BugReportSeverity.CRITICAL,
      }),
      this.bugReportRepository.countBy({
        status: unresolved,
        severity: BugReportSeverity.HIGH,
      }),
      this.bugReportRepository.countBy({ createdAt: MoreThanOrEqual(dayAgo) }),
      this.bugReportRepository.countBy({
        status: BugReportStatus.RESOLVED,
        resolvedAt: MoreThanOrEqual(dayAgo),
      }),
      this.bugReportRepository.findOne({
        where: { status: unresolved },
        select: { id: true, createdAt: true },
        order: { createdAt: "ASC" },
      }),
    ]);

    return {
      open,
      inProgress,
      criticalUnresolved,
      highUnresolved,
      newLast24Hours,
      resolvedLast24Hours,
      oldestUnresolvedAt: oldestUnresolved
        ? oldestUnresolved.createdAt.toISOString()
        : null,
    };
  }

  /** The print of the screen, read through the API so every view is audited. */
  async screenshot(id: string): Promise<BugReportScreenshotFile> {
    const bugReport = await this.bugReportRepository.findOne({
      where: { id },
      select: { id: true, screenshotKey: true },
    });
    if (!bugReport?.screenshotKey) {
      throw new NotFoundException("Este reporte não tem print da tela");
    }
    const extension = bugReport.screenshotKey.split(".").pop() ?? "jpg";
    return {
      buffer: await this.storageService.downloadObject(bugReport.screenshotKey),
      contentType: screenshotContentTypeOf(bugReport.screenshotKey),
      fileName: `bug-${bugReport.id.substring(0, 8)}.${extension}`,
    };
  }

  /** Closed reports past the retention period and their prints. */
  async purgeExpired(now = new Date()): Promise<number> {
    const limit = dayjs(now)
      .subtract(CLOSED_BUG_REPORT_RETENTION_MONTHS, "month")
      .toDate();
    const expired = await this.bugReportRepository.find({
      where: {
        status: In([...CLOSED_BUG_REPORT_STATUSES]),
        updatedAt: LessThan(limit),
      },
      select: { id: true, screenshotKey: true },
      take: PURGE_BATCH,
    });
    if (expired.length === 0) return 0;

    for (const bugReport of expired) {
      if (!bugReport.screenshotKey) continue;
      try {
        await this.storageService.deleteObject(bugReport.screenshotKey);
      } catch (error) {
        this.logger.warn(
          `Print ${bugReport.screenshotKey} not deleted: ${String(error)}`,
        );
      }
    }
    const result = await this.bugReportRepository.delete({
      id: In(expired.map((bugReport) => bugReport.id)),
    });
    return result.affected ?? 0;
  }

  /**
   * Keeps the print under the broker's own folder with a random name and
   * the extension of the real bytes. A print that fails to store never
   * blocks the report, it arrives without it.
   */
  private async storeScreenshot(
    userId: string,
    dataUrl: string | undefined,
  ): Promise<string | null> {
    const screenshot = decodeScreenshot(dataUrl);
    if (!screenshot) return null;
    const key = `bug-reports/${userId}/${randomUUID()}.${screenshot.extension}`;
    try {
      await this.storageService.uploadBuffer(
        key,
        screenshot.buffer,
        screenshot.mimeType,
      );
      return key;
    } catch (error) {
      this.logger.warn(`Print of a bug report not stored: ${String(error)}`);
      return null;
    }
  }

  private async findOrFail(id: string) {
    const bugReport = await this.bugReportRepository.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!bugReport) throw new NotFoundException("Reporte não encontrado");
    return bugReport;
  }
}
