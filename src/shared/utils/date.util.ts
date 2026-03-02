import dayjs, { type Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export class DateHelper {
  /**
   * Returns the current moment in UTC.
   */
  public static nowUtc(): Dayjs {
    return dayjs.utc();
  }

  /**
   * Parses any date-like value and converts it to a UTC Dayjs instance.
   */
  public static toUtc(dateValue: Date | string | number | Dayjs): Dayjs {
    return dayjs.utc(dateValue);
  }

  /**
   * Formats a date-like value as an ISO 8601 string in UTC.
   */
  public static formatUtcToIso(
    dateValue: Date | string | number | Dayjs,
  ): string {
    return dayjs.utc(dateValue).toISOString();
  }

  /**
   * Converts a UTC date to a specific timezone for display purposes.
   */
  public static toTimezone(
    dateValue: Date | string | number | Dayjs,
    targetTimezone: string,
  ): Dayjs {
    return dayjs.utc(dateValue).tz(targetTimezone);
  }

  /**
   * Converts a local-time date from a specific timezone to UTC.
   */
  public static fromTimezone(
    dateValue: Date | string | number,
    sourceTimezone: string,
  ): Dayjs {
    return dayjs.tz(dateValue, sourceTimezone).utc();
  }

  /**
   * Formats a date-like value as a date-only string: "YYYY-MM-DD".
   */
  public static formatDateOnly(
    dateValue: Date | string | number | Dayjs,
  ): string {
    return dayjs.utc(dateValue).format("YYYY-MM-DD");
  }

  /**
   * Formats a date-like value as a full ISO 8601 datetime string in UTC.
   */
  public static formatDateTime(
    dateValue: Date | string | number | Dayjs,
  ): string {
    return dayjs.utc(dateValue).format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");
  }

  /**
   * Returns the difference in minutes between two dates.
   */
  public static diffInMinutes(
    firstDate: Date | string | number | Dayjs,
    secondDate: Date | string | number | Dayjs,
  ): number {
    return dayjs.utc(firstDate).diff(dayjs.utc(secondDate), "minute");
  }

  /**
   * Checks if a given date is before the current UTC moment.
   */
  public static isBeforeNow(
    dateValue: Date | string | number | Dayjs,
  ): boolean {
    return dayjs.utc(dateValue).isBefore(dayjs.utc());
  }

  /**
   * Checks if a given date is after the current UTC moment.
   */
  public static isAfterNow(dateValue: Date | string | number | Dayjs): boolean {
    return dayjs.utc(dateValue).isAfter(dayjs.utc());
  }

  /**
   * Returns a JS Date object from a UTC dayjs instance.
   */
  public static toNativeDate(dayjsInstance: Dayjs): Date {
    return dayjsInstance.toDate();
  }

  /**
   * Adds a duration to a UTC date and returns the result.
   */
  public static addToUtc(
    dateValue: Date | string | number | Dayjs,
    amountToAdd: number,
    unitOfMeasurement: dayjs.ManipulateType,
  ): Dayjs {
    return dayjs.utc(dateValue).add(amountToAdd, unitOfMeasurement);
  }

  /**
   * Subtracts a duration from a UTC date and returns the result.
   */
  public static subtractFromUtc(
    dateValue: Date | string | number | Dayjs,
    amountToSubtract: number,
    unitOfMeasurement: dayjs.ManipulateType,
  ): Dayjs {
    return dayjs.utc(dateValue).subtract(amountToSubtract, unitOfMeasurement);
  }
}
