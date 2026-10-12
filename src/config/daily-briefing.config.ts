import { registerAs } from "@nestjs/config";

export const dailyBriefingConfig = registerAs("dailyBriefing", () => ({
  /**
   * The 8 o'clock sweep that writes every broker's free briefing. Set to
   * "false" on local copies so they do not spend AI on a production dump.
   */
  scheduleEnabled: process.env.DAILY_BRIEFING_SCHEDULE_ENABLED !== "false",
}));
