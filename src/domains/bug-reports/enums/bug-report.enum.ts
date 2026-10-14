/** How the broker reached the report. */
export enum BugReportSource {
  /** The report button, with a description. */
  BUTTON = "button",
  /** Shook the phone and accepted the prompt. */
  SHAKE = "shake",
  /** The panic button: one tap, sent at once, nothing typed. */
  PANIC = "panic",
  /** The error screen of the app, the crash comes along. */
  ERROR_BOUNDARY = "error_boundary",
}

export enum BugReportSeverity {
  NORMAL = "normal",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum BugReportStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  RESOLVED = "resolved",
  DISMISSED = "dismissed",
}

/** Still waiting on somebody, what the daily digest counts as open. */
export const UNRESOLVED_BUG_REPORT_STATUSES = [
  BugReportStatus.OPEN,
  BugReportStatus.IN_PROGRESS,
] as const;

export const CLOSED_BUG_REPORT_STATUSES = [
  BugReportStatus.RESOLVED,
  BugReportStatus.DISMISSED,
] as const;
