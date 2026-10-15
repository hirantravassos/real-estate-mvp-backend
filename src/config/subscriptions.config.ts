import { registerAs } from "@nestjs/config";

/** Takes "69.90" or "69,90"; empty or invalid falls back to the default. */
const readNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number((value ?? "").trim().replace(",", "."));
  return value?.trim() && Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : fallback;
};

/** A price must be above zero, anything else falls back to the default. */
const readPrice = (value: string | undefined, fallback: number) => {
  const parsed = readNumber(value, fallback);
  return parsed > 0 ? parsed : fallback;
};

export const subscriptionsConfig = registerAs("subscriptions", () => ({
  /** Free days of every new account, without the monthly credits. */
  trialDays: Math.round(readNumber(process.env.SUBSCRIPTION_TRIAL_DAYS, 14)),
  /** Gift credits of a new account's trial, so the AI can be tried. */
  trialCredits: Math.round(
    readNumber(process.env.SUBSCRIPTION_TRIAL_CREDITS, 200),
  ),
  /** Days a failed payment keeps the account open while it is fixed. */
  graceDays: Math.round(readNumber(process.env.SUBSCRIPTION_GRACE_DAYS, 7)),
  /** Pix renewal can be paid this many days before the paid month ends. */
  renewalWindowDays: Math.round(
    readNumber(process.env.SUBSCRIPTION_RENEWAL_WINDOW_DAYS, 10),
  ),
  plans: {
    basic: {
      priceInBrl: readPrice(process.env.PLAN_BASIC_PRICE_IN_BRL, 69.9),
      monthlyCredits: Math.round(
        readNumber(process.env.PLAN_BASIC_MONTHLY_CREDITS, 500),
      ),
    },
    recommended: {
      priceInBrl: readPrice(process.env.PLAN_RECOMMENDED_PRICE_IN_BRL, 129.9),
      monthlyCredits: Math.round(
        readNumber(process.env.PLAN_RECOMMENDED_MONTHLY_CREDITS, 1000),
      ),
    },
    premium: {
      priceInBrl: readPrice(process.env.PLAN_PREMIUM_PRICE_IN_BRL, 249.9),
      monthlyCredits: Math.round(
        readNumber(process.env.PLAN_PREMIUM_MONTHLY_CREDITS, 3000),
      ),
    },
  },
}));
