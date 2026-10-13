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
import { Between, Equal, IsNull, Not, Or, Repository } from "typeorm";
import { mailConfig } from "../../../config/mail.config";
import { BrokerMailService } from "../../notifications/services/broker-mail.service";
import { Subscription } from "../entities/subscription.entity";
import { renewalDueMail, trialEndingMail } from "../mails/subscription.mails";
import { SubscriptionService } from "./subscription.service";

const SWEEP_INTERVAL_MILLISECONDS = 6 * 60 * 60 * 1000;
/** Waits for the boot to settle before the first sweep. */
const FIRST_SWEEP_DELAY_MILLISECONDS = 15 * 60 * 1000;
const TRIAL_REMINDER_DAYS = 2;
const RENEWAL_REMINDER_DAYS = 3;
const REMINDERS_PER_SWEEP = 200;

/**
 * Reminds the broker before the access would stop: the trial about to end
 * and the Pix month about to run out (the card renews by itself). Each mark
 * is claimed with a conditional update, so two servers never send twice.
 */
@Injectable()
export class SubscriptionReminderSchedulerService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(
    SubscriptionReminderSchedulerService.name,
  );
  private timer: NodeJS.Timeout | null = null;
  private sweeping = false;

  constructor(
    @Inject(mailConfig.KEY)
    private readonly configuration: ConfigType<typeof mailConfig>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly subscriptionService: SubscriptionService,
    private readonly brokerMailService: BrokerMailService,
  ) {}

  onApplicationBootstrap() {
    if (!this.configuration.remindersEnabled) {
      this.logger.warn(
        "Subscription reminders are off: MAIL_REMINDERS_ENABLED is false",
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
      const trials = await this.remindTrialsEnding(now);
      const renewals = await this.remindPixRenewals(now);
      this.logger.log(
        `Reminder sweep: ${trials} trial and ${renewals} renewal mails sent`,
      );
    } catch (error) {
      this.logger.error(`Reminder sweep failed: ${String(error)}`);
    } finally {
      this.sweeping = false;
    }
  }

  /** Without billing nobody loses access, there is nothing to remind. */
  async remindTrialsEnding(now = new Date()) {
    if (!this.subscriptionService.billingEnabled) return 0;

    const candidates = await this.subscriptionRepository.find({
      where: {
        trialEndsAt: Between(
          now,
          dayjs(now).add(TRIAL_REMINDER_DAYS, "day").toDate(),
        ),
        paidThrough: IsNull(),
        trialReminderSentAt: IsNull(),
      },
      take: REMINDERS_PER_SWEEP,
    });

    let sent = 0;
    for (const subscription of candidates) {
      // A card already set up charges at the end of the trial by itself.
      if (this.subscriptionService.isCardActive(subscription)) continue;

      const claimed = await this.subscriptionRepository.update(
        { id: subscription.id, trialReminderSentAt: IsNull() },
        { trialReminderSentAt: now },
      );
      if (!claimed.affected) continue;

      await this.brokerMailService.deliver(subscription.userId, (context) =>
        trialEndingMail(context, { trialEndsAt: subscription.trialEndsAt }),
      );
      sent++;
    }
    return sent;
  }

  async remindPixRenewals(now = new Date()) {
    if (!this.subscriptionService.billingEnabled) return 0;

    const candidates = await this.subscriptionRepository.find({
      where: {
        paidThrough: Between(
          now,
          dayjs(now).add(RENEWAL_REMINDER_DAYS, "day").toDate(),
        ),
        canceledAt: IsNull(),
      },
      take: REMINDERS_PER_SWEEP,
    });

    let sent = 0;
    for (const subscription of candidates) {
      const paidThrough = subscription.paidThrough;
      if (!paidThrough) continue;
      if (this.subscriptionService.isCardActive(subscription)) continue;
      if (
        subscription.renewalReminderSentFor?.getTime() === paidThrough.getTime()
      ) {
        continue;
      }

      const claimed = await this.subscriptionRepository.update(
        {
          id: subscription.id,
          renewalReminderSentFor: Or(IsNull(), Not(Equal(paidThrough))),
        },
        { renewalReminderSentFor: paidThrough },
      );
      if (!claimed.affected) continue;

      const plan = await this.subscriptionService.effectivePlan(
        subscription,
        now,
      );
      const opensAt = dayjs(paidThrough)
        .subtract(this.subscriptionService.renewalWindowDays, "day")
        .toDate();
      await this.brokerMailService.deliver(subscription.userId, (context) =>
        renewalDueMail(context, {
          planName: plan.name,
          paidThrough,
          renewalOpensAt: opensAt > now ? opensAt : null,
        }),
      );
      sent++;
    }
    return sent;
  }
}
