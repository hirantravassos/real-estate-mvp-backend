import { registerAs } from "@nestjs/config";

export const appConfig = registerAs("app", () => ({
  port: parseInt(process.env.APP_PORT || "3001", 10),
  corsOrigin: process.env.APP_CORS_ORIGIN,
  timezone: process.env.APP_TIMEZONE,
}));
