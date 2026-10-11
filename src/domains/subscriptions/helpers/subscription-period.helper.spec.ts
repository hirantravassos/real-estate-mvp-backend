import { SubscriptionAccessStatus } from "../enums/subscription.enum";
import {
  graceEndsAt,
  nextPeriodStart,
  resolveAccessStatus,
  SubscriptionTimeline,
} from "./subscription-period.helper";

const GRACE_DAYS = 7;
const day = (value: string) => new Date(`${value}T12:00:00.000Z`);

const timelineOf = (
  overrides: Partial<SubscriptionTimeline> = {},
): SubscriptionTimeline => ({
  trialEndsAt: day("2026-10-08"),
  paidThrough: null,
  canceledAt: null,
  firstCardChargeDueAt: null,
  ...overrides,
});

describe("resolveAccessStatus", () => {
  it("is trialing before the trial ends", () => {
    expect(
      resolveAccessStatus(timelineOf(), day("2026-10-05"), GRACE_DAYS),
    ).toBe(SubscriptionAccessStatus.TRIALING);
  });

  it("expires right when the trial ends without payment", () => {
    expect(
      resolveAccessStatus(timelineOf(), day("2026-10-09"), GRACE_DAYS),
    ).toBe(SubscriptionAccessStatus.EXPIRED);
  });

  it("is active while the paid month runs", () => {
    const timeline = timelineOf({ paidThrough: day("2026-11-08") });
    expect(resolveAccessStatus(timeline, day("2026-10-20"), GRACE_DAYS)).toBe(
      SubscriptionAccessStatus.ACTIVE,
    );
  });

  it("keeps the account open for the grace days after a missed payment", () => {
    const timeline = timelineOf({ paidThrough: day("2026-11-08") });
    expect(resolveAccessStatus(timeline, day("2026-11-14"), GRACE_DAYS)).toBe(
      SubscriptionAccessStatus.PAST_DUE,
    );
    expect(resolveAccessStatus(timeline, day("2026-11-16"), GRACE_DAYS)).toBe(
      SubscriptionAccessStatus.EXPIRED,
    );
  });

  it("gives no grace to a cancelled subscription", () => {
    const timeline = timelineOf({
      paidThrough: day("2026-11-08"),
      canceledAt: day("2026-10-20"),
    });
    expect(resolveAccessStatus(timeline, day("2026-10-25"), GRACE_DAYS)).toBe(
      SubscriptionAccessStatus.CANCELED,
    );
    expect(resolveAccessStatus(timeline, day("2026-11-09"), GRACE_DAYS)).toBe(
      SubscriptionAccessStatus.EXPIRED,
    );
  });

  it("waits a few days for the first card charge, never the full grace", () => {
    const timeline = timelineOf({ firstCardChargeDueAt: day("2026-10-08") });
    expect(resolveAccessStatus(timeline, day("2026-10-10"), GRACE_DAYS)).toBe(
      SubscriptionAccessStatus.PAST_DUE,
    );
    expect(resolveAccessStatus(timeline, day("2026-10-12"), GRACE_DAYS)).toBe(
      SubscriptionAccessStatus.EXPIRED,
    );
    expect(graceEndsAt(timeline, GRACE_DAYS)).toEqual(day("2026-10-11"));
  });
});

describe("nextPeriodStart", () => {
  it("starts when the trial ends if paid during the trial", () => {
    expect(
      nextPeriodStart(timelineOf(), day("2026-10-03"), GRACE_DAYS),
    ).toEqual(day("2026-10-08"));
  });

  it("starts now when paid after the trial ended", () => {
    expect(
      nextPeriodStart(timelineOf(), day("2026-10-20"), GRACE_DAYS),
    ).toEqual(day("2026-10-20"));
  });

  it("continues right after the paid month, also during the grace days", () => {
    const timeline = timelineOf({ paidThrough: day("2026-11-08") });
    expect(nextPeriodStart(timeline, day("2026-11-01"), GRACE_DAYS)).toEqual(
      day("2026-11-08"),
    );
    expect(nextPeriodStart(timeline, day("2026-11-12"), GRACE_DAYS)).toEqual(
      day("2026-11-08"),
    );
  });

  it("starts now once the grace is over", () => {
    const timeline = timelineOf({ paidThrough: day("2026-11-08") });
    expect(nextPeriodStart(timeline, day("2026-12-01"), GRACE_DAYS)).toEqual(
      day("2026-12-01"),
    );
  });

  it("starts now after a cancelled month ended", () => {
    const timeline = timelineOf({
      paidThrough: day("2026-11-08"),
      canceledAt: day("2026-10-20"),
    });
    expect(nextPeriodStart(timeline, day("2026-11-10"), GRACE_DAYS)).toEqual(
      day("2026-11-10"),
    );
  });
});
