/**
 * The telemetry the browser sends with a report. It arrives as a free object,
 * so nothing is trusted: every field is copied by name, typed, cut to size and
 * scrubbed of anything that looks like a token. Unknown keys are dropped.
 */

export type BugReportErrorKind =
  | "error"
  | "unhandledrejection"
  | "console"
  | "boundary";

export type BugReportBreadcrumbKind =
  | "navigation"
  | "click"
  | "visibility"
  | "connection";

export interface BugReportTelemetryError {
  at: string | null;
  kind: BugReportErrorKind;
  message: string;
  source: string | null;
  stack: string | null;
}

export interface BugReportTelemetryRequest {
  at: string | null;
  method: string;
  path: string;
  status: number | null;
  durationMilliseconds: number | null;
  code: string | null;
  message: string | null;
}

export interface BugReportTelemetryBreadcrumb {
  at: string | null;
  kind: BugReportBreadcrumbKind;
  label: string;
}

export interface BugReportTelemetry {
  capturedAt: string | null;
  page: {
    path: string | null;
    title: string | null;
    referrerPath: string | null;
    /** Where the broker was on the page, to place the print. */
    scrollY: number | null;
    documentHeight: number | null;
  };
  app: {
    version: string | null;
    sessionStartedAt: string | null;
  };
  device: {
    userAgent: string | null;
    platform: string | null;
    language: string | null;
    timezone: string | null;
    timezoneOffsetMinutes: number | null;
    screenWidth: number | null;
    screenHeight: number | null;
    viewportWidth: number | null;
    viewportHeight: number | null;
    devicePixelRatio: number | null;
    touch: boolean | null;
    standalone: boolean | null;
    online: boolean | null;
    connectionType: string | null;
    downlinkMegabits: number | null;
    memoryGigabytes: number | null;
    processorCores: number | null;
  };
  performance: {
    pageLoadMilliseconds: number | null;
    usedHeapMegabytes: number | null;
    sessionDurationSeconds: number | null;
  };
  errors: BugReportTelemetryError[];
  requests: BugReportTelemetryRequest[];
  breadcrumbs: BugReportTelemetryBreadcrumb[];
}

export const MAXIMUM_TELEMETRY_ERRORS = 20;
export const MAXIMUM_TELEMETRY_REQUESTS = 40;
export const MAXIMUM_TELEMETRY_BREADCRUMBS = 50;

const SHORT_TEXT = 120;
const MEDIUM_TEXT = 500;
const STACK_TEXT = 4000;

const ERROR_KINDS: readonly BugReportErrorKind[] = [
  "error",
  "unhandledrejection",
  "console",
  "boundary",
];
const BREADCRUMB_KINDS: readonly BugReportBreadcrumbKind[] = [
  "navigation",
  "click",
  "visibility",
  "connection",
];
const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"];

const BEARER_PATTERN = /Bearer\s+[\w~+/.=-]+/gi;
const JSON_WEB_TOKEN_PATTERN = /eyJ[\w-]{5,}\.[\w-]{5,}\.[\w-]*/g;
const SECRET_FIELD_PATTERN =
  /("?(?:access_?token|refresh_?token|id_?token|password|secret|authorization|api_?key|session_?token)"?\s*[:=]\s*)"?[^"\s,}&]+"?/gi;
/** Control characters other than tab and line breaks. */
const isControlCharacter = (character: string) => {
  const code = character.charCodeAt(0);
  return (
    (code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127
  );
};

const withoutControlCharacters = (text: string) =>
  Array.from(text)
    .filter((character) => !isControlCharacter(character))
    .join("");

/** Tokens and secrets never reach the database, even inside an error text. */
export const scrubSecrets = (text: string): string =>
  text
    .replace(BEARER_PATTERN, "Bearer [removido]")
    .replace(JSON_WEB_TOKEN_PATTERN, "[token removido]")
    .replace(SECRET_FIELD_PATTERN, "$1[removido]");

const textOf = (value: unknown, maximumLength: number): string | null => {
  if (typeof value !== "string") return null;
  const cleaned = scrubSecrets(withoutControlCharacters(value)).trim();
  if (!cleaned) return null;
  return cleaned.length > maximumLength
    ? `${cleaned.substring(0, maximumLength - 1)}…`
    : cleaned;
};

/** A path with no query string nor fragment, those may carry tokens. */
export const pathOf = (value: unknown): string | null => {
  const text = textOf(value, MEDIUM_TEXT * 2);
  if (!text) return null;
  const withoutOrigin = text.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i, "");
  const path = withoutOrigin.split(/[?#]/)[0] ?? "";
  return path.substring(0, MEDIUM_TEXT) || "/";
};

const numberOf = (
  value: unknown,
  minimum: number,
  maximum: number,
): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < minimum || value > maximum) return null;
  return Math.round(value * 100) / 100;
};

const booleanOf = (value: unknown): boolean | null =>
  typeof value === "boolean" ? value : null;

/** Only a real date becomes a timestamp, anything else is dropped. */
const dateOf = (value: unknown): string | null => {
  if (typeof value !== "string" || value.length > 40) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const recordOf = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** The newest entries are the ones that explain the report. */
const listOf = <Item>(
  value: unknown,
  maximumItems: number,
  map: (entry: Record<string, unknown>) => Item | null,
): Item[] => {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-maximumItems)
    .map((entry) => map(recordOf(entry)))
    .filter((item): item is Item => item !== null);
};

const errorOf = (
  entry: Record<string, unknown>,
): BugReportTelemetryError | null => {
  const message = textOf(entry.message, MEDIUM_TEXT * 2);
  if (!message) return null;
  const kind = ERROR_KINDS.find((candidate) => candidate === entry.kind);
  return {
    at: dateOf(entry.at),
    kind: kind ?? "error",
    message,
    source: textOf(entry.source, MEDIUM_TEXT),
    stack: textOf(entry.stack, STACK_TEXT),
  };
};

const requestOf = (
  entry: Record<string, unknown>,
): BugReportTelemetryRequest | null => {
  const path = pathOf(entry.path);
  const method =
    typeof entry.method === "string" ? entry.method.toUpperCase() : "";
  if (!path || !HTTP_METHODS.includes(method)) return null;
  return {
    at: dateOf(entry.at),
    method,
    path,
    status: numberOf(entry.status, 0, 599),
    durationMilliseconds: numberOf(entry.durationMilliseconds, 0, 600_000),
    code: textOf(entry.code, SHORT_TEXT),
    message: textOf(entry.message, MEDIUM_TEXT),
  };
};

const breadcrumbOf = (
  entry: Record<string, unknown>,
): BugReportTelemetryBreadcrumb | null => {
  const kind = BREADCRUMB_KINDS.find((candidate) => candidate === entry.kind);
  const label =
    kind === "navigation" ? pathOf(entry.label) : textOf(entry.label, 160);
  if (!kind || !label) return null;
  return { at: dateOf(entry.at), kind, label };
};

export const sanitizeBugReportTelemetry = (
  raw: unknown,
): BugReportTelemetry => {
  const telemetry = recordOf(raw);
  const page = recordOf(telemetry.page);
  const app = recordOf(telemetry.app);
  const device = recordOf(telemetry.device);
  const performance = recordOf(telemetry.performance);

  return {
    capturedAt: dateOf(telemetry.capturedAt),
    page: {
      path: pathOf(page.path),
      title: textOf(page.title, SHORT_TEXT * 2),
      referrerPath: pathOf(page.referrerPath),
      scrollY: numberOf(page.scrollY, 0, 1_000_000),
      documentHeight: numberOf(page.documentHeight, 0, 1_000_000),
    },
    app: {
      version: textOf(app.version, 64),
      sessionStartedAt: dateOf(app.sessionStartedAt),
    },
    device: {
      userAgent: textOf(device.userAgent, MEDIUM_TEXT),
      platform: textOf(device.platform, 60),
      language: textOf(device.language, 20),
      timezone: textOf(device.timezone, 60),
      timezoneOffsetMinutes: numberOf(device.timezoneOffsetMinutes, -900, 900),
      screenWidth: numberOf(device.screenWidth, 0, 20_000),
      screenHeight: numberOf(device.screenHeight, 0, 20_000),
      viewportWidth: numberOf(device.viewportWidth, 0, 20_000),
      viewportHeight: numberOf(device.viewportHeight, 0, 20_000),
      devicePixelRatio: numberOf(device.devicePixelRatio, 0, 10),
      touch: booleanOf(device.touch),
      standalone: booleanOf(device.standalone),
      online: booleanOf(device.online),
      connectionType: textOf(device.connectionType, 20),
      downlinkMegabits: numberOf(device.downlinkMegabits, 0, 10_000),
      memoryGigabytes: numberOf(device.memoryGigabytes, 0, 1024),
      processorCores: numberOf(device.processorCores, 0, 1024),
    },
    performance: {
      pageLoadMilliseconds: numberOf(
        performance.pageLoadMilliseconds,
        0,
        600_000,
      ),
      usedHeapMegabytes: numberOf(performance.usedHeapMegabytes, 0, 65_536),
      sessionDurationSeconds: numberOf(
        performance.sessionDurationSeconds,
        0,
        31_536_000,
      ),
    },
    errors: listOf(telemetry.errors, MAXIMUM_TELEMETRY_ERRORS, errorOf),
    requests: listOf(telemetry.requests, MAXIMUM_TELEMETRY_REQUESTS, requestOf),
    breadcrumbs: listOf(
      telemetry.breadcrumbs,
      MAXIMUM_TELEMETRY_BREADCRUMBS,
      breadcrumbOf,
    ),
  };
};

/** The error that best names the problem: a crash first, the latest after. */
export const leadingErrorOf = (
  telemetry: BugReportTelemetry,
): string | null => {
  const boundary = [...telemetry.errors]
    .reverse()
    .find((error) => error.kind === "boundary");
  const latest = boundary ?? telemetry.errors[telemetry.errors.length - 1];
  return latest ? latest.message.substring(0, MEDIUM_TEXT) : null;
};
