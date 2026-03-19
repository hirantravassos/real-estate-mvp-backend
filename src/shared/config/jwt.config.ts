import { registerAs } from "@nestjs/config";

export const jwtConfig = registerAs("jwt", () => ({
  expiration: process.env.JWT_EXPIRATION,
  secret: process.env.JWT_SECRET,
}));
