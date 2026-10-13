import dayjs from "dayjs";
import {
  graceEndsAt,
  SubscriptionTimeline,
} from "../../subscriptions/helpers/subscription-period.helper";

/** Days an account is kept after its access ended, as the Terms promise. */
export const EXPIRED_ACCOUNT_RETENTION_DAYS = 90;

/** The last moment the broker could use the app: trial, paid month or grace. */
export const accessEndedAt = (
  timeline: SubscriptionTimeline,
  graceDays: number,
): Date => {
  const candidates = [
    timeline.trialEndsAt,
    timeline.paidThrough,
    graceEndsAt(timeline, graceDays),
  ].filter((date): date is Date => Boolean(date));
  return new Date(Math.max(...candidates.map((date) => date.getTime())));
};

/** True once the 90 days after the end of the access have passed. */
export const isPastRetention = (
  timeline: SubscriptionTimeline,
  graceDays: number,
  now = new Date(),
) =>
  dayjs(accessEndedAt(timeline, graceDays))
    .add(EXPIRED_ACCOUNT_RETENTION_DAYS, "day")
    .isBefore(now);
