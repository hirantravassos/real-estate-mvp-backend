import { registerAs } from "@nestjs/config";

export const whatsappConfig = registerAs("whatsapp", () => ({
  appId: process.env.META_APP_ID || "",
  appSecret: process.env.META_APP_SECRET || "",
  webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || "verify-token",
  apiVersion: process.env.META_API_VERSION || "v22.0",
  encryptionKey: process.env.WHATSAPP_ENCRYPTION_KEY || "",
}));
