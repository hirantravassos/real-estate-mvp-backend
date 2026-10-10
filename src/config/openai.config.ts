import { registerAs } from "@nestjs/config";

export const openaiConfig = registerAs("openai", () => ({
  apiKey: process.env.OPENAI_API_KEY ?? "",
  baseUrl: (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(
    /\/+$/,
    "",
  ),
  model: process.env.OPENAI_MODEL || "gpt-5-mini",
  /** Leave empty for models without reasoning. */
  reasoningEffort: process.env.OPENAI_REASONING_EFFORT ?? "minimal",
  /** What OpenAI charges us, in US dollars per one million tokens. */
  inputCostPerMillionUsd: parseFloat(
    process.env.OPENAI_INPUT_COST_PER_MILLION_USD || "0.25",
  ),
  outputCostPerMillionUsd: parseFloat(
    process.env.OPENAI_OUTPUT_COST_PER_MILLION_USD || "2",
  ),
}));
