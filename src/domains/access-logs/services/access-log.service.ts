import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import dayjs from "dayjs";
import { LessThan, Repository } from "typeorm";
import { RequestEvidence } from "../../../shared/utils/request-evidence.util";
import { AccessLog, AccessLogEvent } from "../entities/access-log.entity";

/** Marco Civil da Internet, art. 15: six months, no more. */
export const ACCESS_LOG_RETENTION_MONTHS = 6;

@Injectable()
export class AccessLogService {
  private readonly logger = new Logger(AccessLogService.name);

  constructor(
    @InjectRepository(AccessLog)
    private readonly accessLogRepository: Repository<AccessLog>,
  ) {}

  /** Never blocks the sign in: a failed record is only logged. */
  async record(
    userId: string,
    event: AccessLogEvent,
    evidence: RequestEvidence,
  ): Promise<void> {
    try {
      await this.accessLogRepository.insert({
        userId,
        event,
        ip: evidence.ip,
        userAgent: evidence.userAgent,
      });
    } catch (error) {
      this.logger.warn(`Access of ${userId} not recorded: ${String(error)}`);
    }
  }

  /** Deletes what passed the retention period, returns how many went. */
  async purgeExpired(now = new Date()): Promise<number> {
    const limit = dayjs(now)
      .subtract(ACCESS_LOG_RETENTION_MONTHS, "month")
      .toDate();
    const result = await this.accessLogRepository.delete({
      createdAt: LessThan(limit),
    });
    return result.affected ?? 0;
  }
}
