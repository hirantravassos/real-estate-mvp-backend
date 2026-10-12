import dayjs from "dayjs";
import {
  briefingDayOf,
  nextSweepAt,
  sweepPassedToday,
} from "./briefing-schedule.helper";

describe("briefing schedule", () => {
  it("uses the day in Brasília, not in UTC", () => {
    expect(briefingDayOf(dayjs("2026-10-13T02:00:00Z"))).toBe("2026-10-12");
    expect(briefingDayOf(dayjs("2026-10-13T03:00:00Z"))).toBe("2026-10-13");
  });

  it("sweeps today at 8 in Brasília while it has not passed", () => {
    expect(nextSweepAt(dayjs("2026-10-12T10:59:00Z")).toISOString()).toBe(
      "2026-10-12T11:00:00.000Z",
    );
    expect(sweepPassedToday(dayjs("2026-10-12T10:59:00Z"))).toBe(false);
  });

  it("sweeps tomorrow once 8 in Brasília passed", () => {
    expect(nextSweepAt(dayjs("2026-10-12T11:00:00Z")).toISOString()).toBe(
      "2026-10-13T11:00:00.000Z",
    );
    expect(sweepPassedToday(dayjs("2026-10-12T11:00:00Z"))).toBe(true);
  });

  it("counts the late evening in Brasília as the same day", () => {
    expect(nextSweepAt(dayjs("2026-10-13T02:30:00Z")).toISOString()).toBe(
      "2026-10-13T11:00:00.000Z",
    );
  });
});
