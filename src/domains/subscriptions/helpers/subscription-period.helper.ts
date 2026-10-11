import dayjs from "dayjs";
import { SubscriptionAccessStatus } from "../enums/subscription.enum";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

/** While the first card charge is on its way, the account stays open this long at most. */
export const FIRST_CARD_CHARGE_WINDOW_DAYS = 3;

export interface SubscriptionTimeline {
  trialEndsAt: Date;
  /** End of the last paid month. */
  paidThrough: Date | null;
  canceledAt: Date | null;
  /** When the first card charge is due, set only while it was never paid. */
  firstCardChargeDueAt: Date | null;
}

const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * DAY_IN_MILLISECONDS);

const latest = (...dates: Date[]) =>
  new Date(Math.max(...dates.map((date) => date.getTime())));

export const addOneMonth = (date: Date) => dayjs(date).add(1, "month").toDate();

/**
 * Until when a missing payment keeps the account open. Null when there is
 * nothing to wait for: never paid, or cancelled by the broker.
 */
export const graceEndsAt = (
  timeline: SubscriptionTimeline,
  graceDays: number,
): Date | null => {
  if (timeline.canceledAt) return null;
  if (timeline.paidThrough) return addDays(timeline.paidThrough, graceDays);
  if (timeline.firstCardChargeDueAt) {
    return addDays(
      timeline.firstCardChargeDueAt,
      Math.min(graceDays, FIRST_CARD_CHARGE_WINDOW_DAYS),
    );
  }
  return null;
};

export const resolveAccessStatus = (
  timeline: SubscriptionTimeline,
  now: Date,
  graceDays: number,
): SubscriptionAccessStatus => {
  if (timeline.paidThrough && now < timeline.paidThrough) {
    return timeline.canceledAt
      ? SubscriptionAccessStatus.CANCELED
      : SubscriptionAccessStatus.ACTIVE;
  }

  if (now < timeline.trialEndsAt) return SubscriptionAccessStatus.TRIALING;

  const graceEnd = graceEndsAt(timeline, graceDays);
  if (graceEnd && now < graceEnd) return SubscriptionAccessStatus.PAST_DUE;

  return SubscriptionAccessStatus.EXPIRED;
};

export const hasAccess = (status: SubscriptionAccessStatus) =>
  status !== SubscriptionAccessStatus.EXPIRED;

/**
 * Where the next paid month starts. A renewal, even paid during the grace
 * days the broker kept using, continues right after the last paid month, so
 * the months never overlap nor leave free gaps. Paying during the trial
 * never shortens it: the month starts when the trial ends.
 */
export const nextPeriodStart = (
  timeline: Pick<
    SubscriptionTimeline,
    "trialEndsAt" | "paidThrough" | "canceledAt"
  >,
  now: Date,
  graceDays: number,
): Date => {
  const { trialEndsAt, paidThrough, canceledAt } = timeline;

  if (paidThrough) {
    const stillRunning = now < paidThrough;
    const inGrace = !canceledAt && now < addDays(paidThrough, graceDays);
    if (stillRunning || inGrace) return latest(paidThrough, trialEndsAt);
  }

  return latest(now, trialEndsAt);
};
