import { registerAs } from "@nestjs/config";

export const MINIMUM_PROFIT_MULTIPLIER = 3;

export const creditsConfig = registerAs("credits", () => ({
  /** Never below 3, so every credit sold pays at least 3x what the AI cost us. */
  profitMultiplier: Math.max(
    MINIMUM_PROFIT_MULTIPLIER,
    parseFloat(process.env.CREDITS_PROFIT_MULTIPLIER || "3"),
  ),
  /** Keep it a bit above the real rate, it protects the margin from the dollar. */
  usdToBrlRate: parseFloat(process.env.CREDITS_USD_TO_BRL_RATE || "6"),
  adminKey: process.env.CREDITS_ADMIN_KEY ?? "",
  mercadoPagoAccessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN ?? "",
  /** Public key of the same account, loads the secure card form in the browser. */
  mercadoPagoPublicKey: process.env.MERCADO_PAGO_PUBLIC_KEY ?? "",
  /** Secret signature of the webhooks, from Your integrations > Webhooks. */
  mercadoPagoWebhookSecret: process.env.MERCADO_PAGO_WEBHOOK_SECRET ?? "",
  mercadoPagoApiUrl: (
    process.env.MERCADO_PAGO_API_URL || "https://api.mercadopago.com"
  ).replace(/\/+$/, ""),
  /** Public address of this backend, Mercado Pago posts the payment updates there. */
  notificationBaseUrl: (
    process.env.MERCADO_PAGO_NOTIFICATION_BASE_URL ??
    process.env.EVOLUTION_WEBHOOK_BASE_URL ??
    ""
  ).replace(/\/+$/, ""),
}));
