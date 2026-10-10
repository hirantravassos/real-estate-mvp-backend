import { registerAs } from "@nestjs/config";

export const evolutionConfig = registerAs("evolution", () => ({
  url: (process.env.EVOLUTION_API_URL ?? "").replace(/\/+$/, ""),
  apiKey: process.env.EVOLUTION_API_KEY ?? "",
  /** Public address of this backend, Evolution posts the webhooks there. */
  webhookBaseUrl: (process.env.EVOLUTION_WEBHOOK_BASE_URL ?? "").replace(
    /\/+$/,
    "",
  ),
  instancePrefix: process.env.EVOLUTION_INSTANCE_PREFIX || "brokerin",
}));
