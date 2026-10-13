import { accessEndedAt, isPastRetention } from "./access-end.helper";

const day = (text: string) => new Date(`${text}T12:00:00.000Z`);
const GRACE_DAYS = 7;

describe("access end", () => {
  it("is the trial end for an account that never paid", () => {
    const timeline = {
      trialEndsAt: day("2026-01-08"),
      paidThrough: null,
      canceledAt: null,
      firstCardChargeDueAt: null,
    };
    expect(accessEndedAt(timeline, GRACE_DAYS)).toEqual(day("2026-01-08"));
    expect(isPastRetention(timeline, GRACE_DAYS, day("2026-04-01"))).toBe(
      false,
    );
    expect(isPastRetention(timeline, GRACE_DAYS, day("2026-04-10"))).toBe(true);
  });

  it("counts the grace days after a paid month that was not renewed", () => {
    const timeline = {
      trialEndsAt: day("2026-01-08"),
      paidThrough: day("2026-03-08"),
      canceledAt: null,
      firstCardChargeDueAt: null,
    };
    expect(accessEndedAt(timeline, GRACE_DAYS)).toEqual(day("2026-03-15"));
    expect(isPastRetention(timeline, GRACE_DAYS, day("2026-06-10"))).toBe(
      false,
    );
    expect(isPastRetention(timeline, GRACE_DAYS, day("2026-06-15"))).toBe(true);
  });

  it("has no grace after a cancellation", () => {
    const timeline = {
      trialEndsAt: day("2026-01-08"),
      paidThrough: day("2026-03-08"),
      canceledAt: day("2026-02-20"),
      firstCardChargeDueAt: null,
    };
    expect(accessEndedAt(timeline, GRACE_DAYS)).toEqual(day("2026-03-08"));
  });
});
