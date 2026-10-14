import { registerAs } from "@nestjs/config";

/** A shorter key is guessable: the backoffice then stays closed. */
export const MINIMUM_ADMIN_ACCESS_KEY_LENGTH = 32;

const DEFAULT_SESSION_MINUTES = 15;
const MINIMUM_SESSION_MINUTES = 5;
const MAXIMUM_SESSION_MINUTES = 60;

const parseEmailList = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

/**
 * The backoffice opens only for an allowlisted email, confirmed again with
 * Google, plus the access key. No fallback: with either one missing the
 * backoffice stays closed for everybody.
 */
export const adminConfig = registerAs("admin", () => ({
  allowedEmails: parseEmailList(process.env.ADMIN_ALLOWED_EMAILS),
  accessKey: process.env.ADMIN_ACCESS_KEY?.trim() ?? "",
  /** How long a confirmed admin session lasts before asking again. */
  sessionMinutes: Math.min(
    MAXIMUM_SESSION_MINUTES,
    Math.max(
      MINIMUM_SESSION_MINUTES,
      parseInt(
        process.env.ADMIN_SESSION_MINUTES || String(DEFAULT_SESSION_MINUTES),
        10,
      ) || DEFAULT_SESSION_MINUTES,
    ),
  ),
}));
