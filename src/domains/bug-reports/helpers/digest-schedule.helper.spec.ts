import dayjs from "dayjs";
import {
  digestDayOf,
  digestPassedToday,
  nextDigestAt,
} from "./digest-schedule.helper";

describe("digest schedule", () => {
  it("fires today at 9 in Brasília when it has not passed yet", () => {
    const now = dayjs("2026-10-14T10:00:00.000Z"); // 07:00 in Brasília
    expect(nextDigestAt(now).toISOString()).toBe("2026-10-14T12:00:00.000Z");
    expect(digestPassedToday(now)).toBe(false);
  });

  it("fires tomorrow once today's time passed", () => {
    const now = dayjs("2026-10-14T15:00:00.000Z"); // 12:00 in Brasília
    expect(nextDigestAt(now).toISOString()).toBe("2026-10-15T12:00:00.000Z");
    expect(digestPassedToday(now)).toBe(true);
  });

  it("counts the day in Brasília, not in UTC", () => {
    expect(digestDayOf(dayjs("2026-10-15T02:00:00.000Z"))).toBe("2026-10-14");
  });
});
