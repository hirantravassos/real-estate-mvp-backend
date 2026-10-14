import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import dayjs from "dayjs";
import { MoreThanOrEqual, Repository } from "typeorm";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";
import { AccessLog } from "../../access-logs/entities/access-log.entity";
import { AuditLogService } from "../../audit-logs/services/audit-log.service";
import { User } from "../../users/entities/user.entity";
import {
  AdminAuditLogQueryDto,
  AdminOverviewDto,
  AdminUserListQueryDto,
} from "../dtos/admin.dto";
import { escapeLikePattern } from "../helpers/like-pattern.helper";
import { AdminMapper } from "../mappers/admin.mapper";

/** What the backoffice reads: the numbers, the brokers and the trail. */
@Injectable()
export class AdminDirectoryService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AccessLog)
    private readonly accessLogRepository: Repository<AccessLog>,
    private readonly auditLogService: AuditLogService,
  ) {}

  /** Deleted accounts stay anonymized and inactive, counted apart. */
  async overview(now = new Date()): Promise<AdminOverviewDto> {
    const sevenDaysAgo = dayjs(now).subtract(7, "day").toDate();
    const thirtyDaysAgo = dayjs(now).subtract(30, "day").toDate();

    const [
      totalUsers,
      deletedUsers,
      newUsersLast7Days,
      newUsersLast30Days,
      activeUsersLast7Days,
      activeUsersLast30Days,
    ] = await Promise.all([
      this.userRepository.countBy({ active: true }),
      this.userRepository.countBy({ active: false }),
      this.userRepository.countBy({
        active: true,
        createdAt: MoreThanOrEqual(sevenDaysAgo),
      }),
      this.userRepository.countBy({
        active: true,
        createdAt: MoreThanOrEqual(thirtyDaysAgo),
      }),
      this.countUsersWithAccessSince(sevenDaysAgo),
      this.countUsersWithAccessSince(thirtyDaysAgo),
    ]);

    return {
      totalUsers,
      deletedUsers,
      newUsersLast7Days,
      newUsersLast30Days,
      activeUsersLast7Days,
      activeUsersLast30Days,
    };
  }

  /** Newest accounts first, with when each one last used the app. */
  async listUsers(query: AdminUserListQueryDto) {
    const builder = this.userRepository
      .createQueryBuilder("broker")
      .select([
        "broker.id",
        "broker.name",
        "broker.email",
        "broker.city",
        "broker.creci",
        "broker.profileImage",
        "broker.createdAt",
      ])
      .where("broker.active = :active", { active: true })
      .orderBy("broker.createdAt", "DESC")
      .skip(query.skip)
      .take(query.limit);

    const search = query.search?.trim();
    if (search) {
      builder.andWhere(
        "(broker.name LIKE :pattern OR broker.email LIKE :pattern)",
        { pattern: `%${escapeLikePattern(search)}%` },
      );
    }

    const [users, total] = await builder.getManyAndCount();
    const lastAccessByUser = await this.lastAccessOf(
      users.map((user) => user.id),
    );

    return PaginationMapper.toDto(
      [
        users.map((user) =>
          AdminMapper.toUserDto(user, lastAccessByUser.get(user.id) ?? null),
        ),
        total,
      ],
      query,
    );
  }

  async listAuditLogs(query: AdminAuditLogQueryDto) {
    const [auditLogs, total] = await this.auditLogService.findPage(
      { userId: query.userId, scope: query.scope, outcome: query.outcome },
      query,
    );
    return PaginationMapper.toDto(
      [auditLogs.map((auditLog) => AdminMapper.toAuditLogDto(auditLog)), total],
      query,
    );
  }

  private async countUsersWithAccessSince(since: Date): Promise<number> {
    const row = await this.accessLogRepository
      .createQueryBuilder("accessLog")
      .select("COUNT(DISTINCT accessLog.userId)", "total")
      .where("accessLog.createdAt >= :since", { since })
      .getRawOne<{ total: string | number | null }>();
    return Number(row?.total ?? 0);
  }

  private async lastAccessOf(userIds: string[]): Promise<Map<string, Date>> {
    if (userIds.length === 0) return new Map();
    const rows = await this.accessLogRepository
      .createQueryBuilder("accessLog")
      .select("accessLog.userId", "userId")
      .addSelect("MAX(accessLog.createdAt)", "lastAccessAt")
      .where("accessLog.userId IN (:...userIds)", { userIds })
      .groupBy("accessLog.userId")
      .getRawMany<{ userId: string; lastAccessAt: Date | string }>();
    return new Map(rows.map((row) => [row.userId, new Date(row.lastAccessAt)]));
  }
}
