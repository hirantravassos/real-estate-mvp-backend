import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import dayjs from "dayjs";
import {
  FindOptionsWhere,
  In,
  LessThan,
  MoreThanOrEqual,
  Repository,
} from "typeorm";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { RequestEvidence } from "../../../shared/utils/request-evidence.util";
import {
  AuditLog,
  AuditLogOutcome,
  AuditLogScope,
} from "../entities/audit-log.entity";

/** Same six months as the access logs (Marco Civil, art. 15). */
export const AUDIT_LOG_RETENTION_MONTHS = 6;

export interface AuditLogEntry {
  userId: string | null;
  scope: AuditLogScope;
  action: string;
  outcome: AuditLogOutcome;
  evidence: RequestEvidence;
  resourceId?: string | null;
  statusCode?: number | null;
  detail?: string | null;
}

export interface AuditLogFilters {
  userId?: string;
  scope?: AuditLogScope;
  outcome?: AuditLogOutcome;
}

export interface RecentAttemptFilters {
  action: string;
  outcomes: AuditLogOutcome[];
  since: Date;
  userId?: string;
  ip?: string | null;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /** Never blocks the request: a failed record is only logged. */
  async record(entry: AuditLogEntry): Promise<void> {
    try {
      await this.auditLogRepository.insert({
        userId: entry.userId,
        scope: entry.scope,
        action: entry.action.substring(0, 160),
        outcome: entry.outcome,
        resourceId: entry.resourceId?.substring(0, 64) ?? null,
        statusCode: entry.statusCode ?? null,
        ip: entry.evidence.ip,
        userAgent: entry.evidence.userAgent,
        detail: entry.detail?.substring(0, 500) ?? null,
      });
    } catch (error) {
      this.logger.warn(
        `Audit of ${entry.action} by ${entry.userId ?? "anonymous"} not recorded: ${String(error)}`,
      );
    }
  }

  /** How many matching attempts happened since the date, for the lockouts. */
  countRecentAttempts(filters: RecentAttemptFilters): Promise<number> {
    const where: FindOptionsWhere<AuditLog> = {
      action: filters.action,
      outcome: In(filters.outcomes),
      createdAt: MoreThanOrEqual(filters.since),
    };
    if (filters.userId) where.userId = filters.userId;
    if (filters.ip) where.ip = filters.ip;
    return this.auditLogRepository.count({ where });
  }

  /** Newest first, with the name and email of who acted. */
  findPage(filters: AuditLogFilters, pagination: PaginationRequestDto) {
    const where: FindOptionsWhere<AuditLog> = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.scope) where.scope = filters.scope;
    if (filters.outcome) where.outcome = filters.outcome;

    return this.auditLogRepository.findAndCount({
      where,
      relations: { user: true },
      select: {
        id: true,
        createdAt: true,
        userId: true,
        scope: true,
        action: true,
        resourceId: true,
        statusCode: true,
        outcome: true,
        ip: true,
        userAgent: true,
        detail: true,
        user: { id: true, name: true, email: true },
      },
      order: { createdAt: "DESC" },
      skip: pagination.skip,
      take: pagination.limit,
    });
  }

  /** Deletes what passed the retention period, returns how many went. */
  async purgeExpired(now = new Date()): Promise<number> {
    const limit = dayjs(now)
      .subtract(AUDIT_LOG_RETENTION_MONTHS, "month")
      .toDate();
    const result = await this.auditLogRepository.delete({
      createdAt: LessThan(limit),
    });
    return result.affected ?? 0;
  }
}
