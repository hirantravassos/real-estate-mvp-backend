import dayjs, { Dayjs } from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

/** Brasília, when the team starts the day. */
export const DIGEST_TIMEZONE = "America/Sao_Paulo";
export const DIGEST_HOUR = 9;

/** The calendar day in Brasília, like "2026-10-14", one digest each. */
export const digestDayOf = (now: Dayjs = dayjs()) =>
  now.tz(DIGEST_TIMEZONE).format("YYYY-MM-DD");

const digestOn = (day: string) =>
  dayjs.tz(
    `${day} ${String(DIGEST_HOUR).padStart(2, "0")}:00`,
    DIGEST_TIMEZONE,
  );

/** The next digest, today at 9 if it has not passed yet. */
export const nextDigestAt = (now: Dayjs = dayjs()): Date => {
  const today = digestDayOf(now);
  const todayDigest = digestOn(today);
  if (todayDigest.isAfter(now)) return todayDigest.toDate();
  return digestOn(
    dayjs.tz(today, DIGEST_TIMEZONE).add(1, "day").format("YYYY-MM-DD"),
  ).toDate();
};

/** Whether today's digest time already passed, a restart then catches up. */
export const digestPassedToday = (now: Dayjs = dayjs()) =>
  !digestOn(digestDayOf(now)).isAfter(now);
