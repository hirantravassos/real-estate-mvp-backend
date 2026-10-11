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
  welcomeCredits: parseInt(process.env.CREDITS_WELCOME_BONUS || "0", 10),
  adminKey: process.env.CREDITS_ADMIN_KEY ?? "",
  mercadoPagoAccessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN ?? "",
  /** Test credentials only accept a test buyer as payer, leave empty in production. */
  mercadoPagoTestPayerEmail: process.env.MERCADO_PAGO_TEST_PAYER_EMAIL ?? "",
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
