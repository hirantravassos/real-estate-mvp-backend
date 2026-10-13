import { registerAs } from "@nestjs/config";

export const dataRetentionConfig = registerAs("dataRetention", () => ({
  /**
   * The daily sweep that drops access logs older than six months and erases
   * accounts expired for more than 90 days. Set to "false" on local copies
   * of production data, so they never erase anything.
   */
  scheduleEnabled: process.env.DATA_RETENTION_SCHEDULE_ENABLED !== "false",
}));
