import { registerAs } from "@nestjs/config";
import "reflect-metadata";

export const mongoConfig = registerAs("mongo", () => ({
  host: process.env.MONGO_HOST || "localhost",
  port: parseInt(process.env.MONGO_PORT || "27017", 10),
  username: process.env.MONGO_USERNAME || "root",
  password: process.env.MONGO_PASSWORD || "",
  database: process.env.MONGO_NAME || "whatsapp",
}));
