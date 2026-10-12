import dayjs, { Dayjs } from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

/** Brasília time (UTC-3), when the brokers start their day. */
export const BRIEFING_TIMEZONE = "America/Sao_Paulo";
export const BRIEFING_HOUR = 8;

/** The broker's calendar day, like "2026-10-12", one free briefing each. */
export const briefingDayOf = (now: Dayjs = dayjs()) =>
  now.tz(BRIEFING_TIMEZONE).format("YYYY-MM-DD");

const sweepOn = (day: string) =>
  dayjs.tz(
    `${day} ${String(BRIEFING_HOUR).padStart(2, "0")}:00`,
    BRIEFING_TIMEZONE,
  );

/** The next morning sweep, today at 8 if it has not passed yet. */
export const nextSweepAt = (now: Dayjs = dayjs()): Date => {
  const today = briefingDayOf(now);
  const todaySweep = sweepOn(today);
  if (todaySweep.isAfter(now)) return todaySweep.toDate();
  return sweepOn(
    dayjs.tz(today, BRIEFING_TIMEZONE).add(1, "day").format("YYYY-MM-DD"),
  ).toDate();
};

/** Whether today's sweep time already passed, a restart then catches up. */
export const sweepPassedToday = (now: Dayjs = dayjs()) =>
  !sweepOn(briefingDayOf(now)).isAfter(now);
