import { registerAs } from "@nestjs/config";

export const mailConfig = registerAs("mail", () => ({
  host: process.env.MAIL_HOST || "smtp.example.com",
  port: parseInt(process.env.MAIL_PORT || "587", 10),
  user: process.env.MAIL_USER || "",
  password: process.env.MAIL_PASSWORD || "",
  from: process.env.MAIL_FROM || "noreply@example.com",
  /**
   * The scheduled reminders (trial ending, Pix renewal, erasure warning).
   * Set to "false" on local copies of production data, so real brokers are
   * never written to from there.
   */
  remindersEnabled: process.env.MAIL_REMINDERS_ENABLED !== "false",
}));
