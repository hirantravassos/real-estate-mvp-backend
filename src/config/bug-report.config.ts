import { registerAs } from "@nestjs/config";

export const bugReportConfig = registerAs("bugReport", () => ({
  /**
   * The 9 o'clock mail to every ADMIN_ALLOWED_EMAILS address with how many
   * bug reports are open. Set to "false" on local copies of production data.
   */
  digestEnabled: process.env.BUG_REPORT_DIGEST_ENABLED !== "false",
}));
