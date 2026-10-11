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
  /** Turns the broker's voice into text for the assistant. */
  transcriptionModel:
    process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe",
  /** What OpenAI charges for transcriptions billed by tokens. */
  transcriptionAudioCostPerMillionUsd: parseFloat(
    process.env.OPENAI_TRANSCRIPTION_AUDIO_COST_PER_MILLION_USD || "3",
  ),
  transcriptionTextCostPerMillionUsd: parseFloat(
    process.env.OPENAI_TRANSCRIPTION_TEXT_COST_PER_MILLION_USD || "5",
  ),
  /** What OpenAI charges for transcriptions billed by the minute. */
  transcriptionCostPerMinuteUsd: parseFloat(
    process.env.OPENAI_TRANSCRIPTION_COST_PER_MINUTE_USD || "0.006",
  ),
}));
