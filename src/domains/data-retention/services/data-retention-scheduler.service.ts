import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import dayjs from "dayjs";
import { Equal, IsNull, LessThan, Not, Or, Repository } from "typeorm";
import { dataRetentionConfig } from "../../../config/data-retention.config";
import { AccessLogService } from "../../access-logs/services/access-log.service";
import { AuditLogService } from "../../audit-logs/services/audit-log.service";
import { ACCOUNT_DELETION_CONFIRMATION } from "../../account-deletions/dtos/account-deletion.dto";
import { AccountDeletionReason } from "../../account-deletions/mails/account-deletion.mails";
import { AccountDeletionService } from "../../account-deletions/services/account-deletion.service";
import { BrokerMailService } from "../../notifications/services/broker-mail.service";
import { Subscription } from "../../subscriptions/entities/subscription.entity";
import { SubscriptionService } from "../../subscriptions/services/subscription.service";
import { User } from "../../users/entities/user.entity";
import {
  accessEndedAt,
  EXPIRED_ACCOUNT_RETENTION_DAYS,
  isPastRetention,
} from "../helpers/access-end.helper";
import { erasureWarningMail } from "../mails/data-retention.mails";

const SWEEP_INTERVAL_MILLISECONDS = 24 * 60 * 60 * 1000;
/** Waits for the boot to settle before the first sweep. */
const FIRST_SWEEP_DELAY_MILLISECONDS = 10 * 60 * 1000;
/** Accounts erased per sweep, the rest waits for the next day. */
const ACCOUNTS_PER_SWEEP = 50;
/** The broker is warned this many days before the account is erased. */
const ERASURE_WARNING_DAYS = 7;
const WARNINGS_PER_SWEEP = 200;

/**
 * Once a day: drops the access logs older than six months and erases the
 * accounts whose access ended more than 90 days ago, as the Terms and the
 * Privacy Policy promise. Both steps are idempotent, two servers are fine.
 */
@Injectable()
export class DataRetentionSchedulerService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(DataRetentionSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private sweeping = false;

  constructor(
    @Inject(dataRetentionConfig.KEY)
    private readonly configuration: ConfigType<typeof dataRetentionConfig>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly accessLogService: AccessLogService,
    private readonly auditLogService: AuditLogService,
    private readonly accountDeletionService: AccountDeletionService,
    private readonly subscriptionService: SubscriptionService,
    private readonly brokerMailService: BrokerMailService,
  ) {}

  onApplicationBootstrap() {
    if (!this.configuration.scheduleEnabled) {
      this.logger.warn(
        "Data retention sweep is off: DATA_RETENTION_SCHEDULE_ENABLED is false",
      );
      return;
    }
    this.timer = setTimeout(() => {
      void this.sweep();
      this.timer = setInterval(
        () => void this.sweep(),
        SWEEP_INTERVAL_MILLISECONDS,
      );
      this.timer.unref();
    }, FIRST_SWEEP_DELAY_MILLISECONDS);
    this.timer.unref();
  }

  onApplicationShutdown() {
    if (this.timer) clearTimeout(this.timer);
  }

  async sweep(now = new Date()) {
    if (this.sweeping) return;
    this.sweeping = true;
    try {
      const logs = await this.accessLogService.purgeExpired(now);
      const auditLogs = await this.auditLogService.purgeExpired(now);
      const warnings = await this.warnUpcomingErasures(now);
      const accounts = await this.purgeExpiredAccounts(now);
      this.logger.log(
        `Retention sweep: ${logs} access logs, ${auditLogs} audit logs and ${accounts} expired accounts removed, ${warnings} erasure warnings sent`,
      );
    } catch (error) {
      this.logger.error(`Retention sweep failed: ${String(error)}`);
    } finally {
      this.sweeping = false;
    }
  }

  /**
   * A week before the erasure the broker is told, once per access end: a
   * broker who pays and lapses again is warned again. The mark is claimed
   * with a conditional update, so two servers never send twice.
   */
  async warnUpcomingErasures(now = new Date()) {
    if (!this.subscriptionService.billingEnabled) return 0;

    const limit = dayjs(now)
      .subtract(EXPIRED_ACCOUNT_RETENTION_DAYS - ERASURE_WARNING_DAYS, "day")
      .toDate();
    const candidates = await this.subscriptionRepository.find({
      where: {
        trialEndsAt: LessThan(limit),
        paidThrough: Or(IsNull(), LessThan(limit)),
      },
      take: WARNINGS_PER_SWEEP,
    });

    let warned = 0;
    for (const subscription of candidates) {
      if (this.subscriptionService.isCardActive(subscription)) continue;
      const accessEnd = accessEndedAt(
        this.subscriptionService.timelineOf(subscription),
        this.subscriptionService.graceDays,
      );
      const erasureAt = dayjs(accessEnd)
        .add(EXPIRED_ACCOUNT_RETENTION_DAYS, "day")
        .toDate();
      const warningOpensAt = dayjs(erasureAt)
        .subtract(ERASURE_WARNING_DAYS, "day")
        .toDate();
      if (now < warningOpensAt || now >= erasureAt) continue;
      if (
        subscription.erasureWarningSentFor?.getTime() === accessEnd.getTime()
      ) {
        continue;
      }

      const claimed = await this.subscriptionRepository.update(
        {
          id: subscription.id,
          erasureWarningSentFor: Or(IsNull(), Not(Equal(accessEnd))),
        },
        { erasureWarningSentFor: accessEnd },
      );
      if (!claimed.affected) continue;

      await this.brokerMailService.deliver(subscription.userId, (context) =>
        erasureWarningMail(context, { erasureAt }),
      );
      warned++;
    }
    return warned;
  }

  /** Without billing nobody ever loses access, so nothing expires. */
  async purgeExpiredAccounts(now = new Date()) {
    if (!this.subscriptionService.billingEnabled) return 0;

    const limit = dayjs(now)
      .subtract(EXPIRED_ACCOUNT_RETENTION_DAYS, "day")
      .toDate();
    // A cheap first cut in SQL, the exact end of access is checked below.
    const candidates = await this.subscriptionRepository.find({
      where: {
        trialEndsAt: LessThan(limit),
        paidThrough: Or(IsNull(), LessThan(limit)),
      },
      take: ACCOUNTS_PER_SWEEP * 4,
    });

    let erased = 0;
    for (const subscription of candidates) {
      if (erased >= ACCOUNTS_PER_SWEEP) break;
      const timeline = this.subscriptionService.timelineOf(subscription);
      if (
        !isPastRetention(timeline, this.subscriptionService.graceDays, now) ||
        this.subscriptionService.isCardActive(subscription)
      ) {
        continue;
      }
      const user = await this.userRepository.findOneBy({
        id: subscription.userId,
        active: true,
      });
      if (!user) continue;

      try {
        await this.accountDeletionService.deleteAccount(
          user,
          ACCOUNT_DELETION_CONFIRMATION,
          AccountDeletionReason.RETENTION,
        );
        erased++;
      } catch (error) {
        this.logger.error(
          `Expired account ${user.id} not erased: ${String(error)}`,
        );
      }
    }
    return erased;
  }
}
