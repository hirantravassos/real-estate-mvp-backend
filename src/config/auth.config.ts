import { registerAs } from "@nestjs/config";

export const authConfig = registerAs("auth", () => ({
  jwtSecret: process.env.JWT_SECRET,
  jwtExpirationTime: parseInt(process.env.JWT_EXPIRATION_TIME || "3600", 10),
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  /** A device unused this long signs in again, every refresh restarts it. */
  refreshSessionIdleDays: parseInt(
    process.env.REFRESH_SESSION_IDLE_DAYS || "60",
    10,
  ),
  /** The most a device stays signed in, however often it is used. */
  refreshSessionMaximumDays: parseInt(
    process.env.REFRESH_SESSION_MAXIMUM_DAYS || "365",
    10,
  ),
  mfaTokenExpirationMinutes: parseInt(
    process.env.MFA_TOKEN_EXPIRATION_MINUTES || "5",
    10,
  ),
  mfaTokenLength: parseInt(process.env.MFA_TOKEN_LENGTH || "6", 10),
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleCallbackUrl:
    process.env.GOOGLE_CALLBACK_URL ||
    "http://localhost:3001/api/auth/google/callback",
}));
