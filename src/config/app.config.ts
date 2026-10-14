import { registerAs } from "@nestjs/config";
import { readConfiguredCorsOrigins } from "../shared/utils/cors-origins.util.js";

export const appConfig = registerAs("app", () => ({
  port: parseInt(process.env.APP_PORT || "3001", 10),
  corsOrigin: process.env.APP_CORS_ORIGIN,
  timezone: process.env.APP_TIMEZONE,
  /** Where the broker's app lives, used for the public property links. */
  frontendUrl: (
    process.env.APP_FRONTEND_URL ||
    readConfiguredCorsOrigins()[0] ||
    "http://localhost:3000"
  ).replace(/\/+$/, ""),
}));
