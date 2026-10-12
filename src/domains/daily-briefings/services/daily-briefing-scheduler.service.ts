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
import { Repository } from "typeorm";
import { dailyBriefingConfig } from "../../../config/daily-briefing.config";
import { OpenaiService } from "../../../infrastructure/openai/services/openai.service";
import { Customer } from "../../customers/entities/customer.entity";
import { SubscriptionService } from "../../subscriptions/services/subscription.service";
import {
  BRIEFING_TIMEZONE,
  nextSweepAt,
  sweepPassedToday,
} from "../helpers/briefing-schedule.helper";
import { DailyBriefingService } from "./daily-briefing.service";

/** Brokers written at the same time, keeps the AI provider calm. */
const SWEEP_CONCURRENCY = 3;
/** A restart before noon still writes the morning briefings it missed. */
const CATCH_UP_UNTIL_HOUR = 12;
/** Fires a little after 8, never a hair before it. */
const TIMER_MARGIN_MILLISECONDS = 2_000;

/**
 * Writes the free briefing of every broker at 8 in Brasília. A plain timer
 * is enough: the unique free day keeps it right even with two servers.
 */
@Injectable()
export class DailyBriefingSchedulerService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(DailyBriefingSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private sweeping = false;

  constructor(
    @Inject(dailyBriefingConfig.KEY)
    private readonly configuration: ConfigType<typeof dailyBriefingConfig>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly briefingService: DailyBriefingService,
    private readonly subscriptionService: SubscriptionService,
    private readonly openaiService: OpenaiService,
  ) {}

  onApplicationBootstrap() {
    if (
      !this.configuration.scheduleEnabled ||
      !this.openaiService.isConfigured
    ) {
      this.logger.warn(
        "Daily briefing sweep is off: DAILY_BRIEFING_SCHEDULE_ENABLED is false or OPENAI_API_KEY is empty",
      );
      return;
    }

    this.arm();
    const hour = dayjs().tz(BRIEFING_TIMEZONE).hour();
    if (sweepPassedToday() && hour < CATCH_UP_UNTIL_HOUR) void this.sweep();
  }

  onApplicationShutdown() {
    if (this.timer) clearTimeout(this.timer);
  }

  private arm() {
    const delay =
      nextSweepAt().getTime() - Date.now() + TIMER_MARGIN_MILLISECONDS;
    this.timer = setTimeout(() => {
      this.arm();
      void this.sweep();
    }, delay);
    this.timer.unref();
  }

  async sweep() {
    if (this.sweeping) return;
    this.sweeping = true;
    const startedAt = Date.now();

    try {
      const served = await this.briefingService.servedToday();
      const owners = await this.customerRepository
        .createQueryBuilder("customer")
        .select("DISTINCT customer.userId", "userId")
        .where("customer.active = :active", { active: true })
        .getRawMany<{ userId: string }>();

      const queue = owners
        .map((owner) => owner.userId)
        .filter((userId) => !served.has(userId));

      let written = 0;
      let failed = 0;
      const worker = async () => {
        while (queue.length) {
          const userId = queue.shift()!;
          try {
            if (!(await this.subscriptionService.isActive(userId))) continue;
            if (await this.briefingService.generateScheduled(userId)) {
              written += 1;
            }
          } catch (error) {
            failed += 1;
            this.logger.warn(
              `Daily briefing of ${userId} failed: ${(error as Error).message}`,
            );
          }
        }
      };
      await Promise.all(
        Array.from({ length: SWEEP_CONCURRENCY }, () => worker()),
      );

      this.logger.log(
        `Daily briefing sweep: ${written} written, ${failed} failed in ${Math.round((Date.now() - startedAt) / 1000)}s`,
      );
    } catch (error) {
      this.logger.error(
        `Daily briefing sweep stopped: ${(error as Error).message}`,
      );
    } finally {
      this.sweeping = false;
    }
  }
}
