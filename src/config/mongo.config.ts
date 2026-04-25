import { registerAs } from "@nestjs/config";

export const mongoConfig = registerAs("mongo", () => ({
  mongoUri: process.env.MONGO_URI || "",
}));
