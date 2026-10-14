import { BugReportSeverity, BugReportSource } from "../enums/bug-report.enum";

/**
 * Decided on the server, never sent by the browser: a panic is critical, a
 * crash or a report that stops the broker's work is high, the rest normal.
 */
export const severityOf = (
  source: BugReportSource,
  blocking: boolean,
): BugReportSeverity => {
  if (source === BugReportSource.PANIC) return BugReportSeverity.CRITICAL;
  if (source === BugReportSource.ERROR_BOUNDARY || blocking) {
    return BugReportSeverity.HIGH;
  }
  return BugReportSeverity.NORMAL;
};
