import { registerAs } from "@nestjs/config";

const numberFromEnvironment = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

export const evolutionConfig = registerAs("evolution", () => ({
  url: (process.env.EVOLUTION_API_URL ?? "").replace(/\/+$/, ""),
  apiKey: process.env.EVOLUTION_API_KEY ?? "",
  /** Public address of this backend, Evolution posts the webhooks there. */
  webhookBaseUrl: (process.env.EVOLUTION_WEBHOOK_BASE_URL ?? "").replace(
    /\/+$/,
    "",
  ),
  instancePrefix: process.env.EVOLUTION_INSTANCE_PREFIX || "brokerin",
  /**
   * Thresholds that keep each number looking like a person on WhatsApp, so
   * it does not get flagged as a bot and banned. Every send of a number goes
   * through one queue that respects them.
   */
  safety: {
    /** Pause between two messages to different chats, picked at random in the range. */
    chatSwitchDelayMinimumMilliseconds: numberFromEnvironment(
      "WHATSAPP_CHAT_SWITCH_DELAY_MINIMUM_MS",
      4_000,
    ),
    chatSwitchDelayMaximumMilliseconds: numberFromEnvironment(
      "WHATSAPP_CHAT_SWITCH_DELAY_MAXIMUM_MS",
      9_000,
    ),
    /** Pause between two messages in the same chat. */
    sameChatDelayMinimumMilliseconds: numberFromEnvironment(
      "WHATSAPP_SAME_CHAT_DELAY_MINIMUM_MS",
      1_200,
    ),
    sameChatDelayMaximumMilliseconds: numberFromEnvironment(
      "WHATSAPP_SAME_CHAT_DELAY_MAXIMUM_MS",
      3_000,
    ),
    /** Shows "typing..." or "recording..." before each message, as a person would. */
    typingMinimumMilliseconds: numberFromEnvironment(
      "WHATSAPP_TYPING_MINIMUM_MS",
      800,
    ),
    typingMaximumMilliseconds: numberFromEnvironment(
      "WHATSAPP_TYPING_MAXIMUM_MS",
      4_000,
    ),
    messagesPerMinute: numberFromEnvironment(
      "WHATSAPP_MESSAGES_PER_MINUTE",
      12,
    ),
    messagesPerHour: numberFromEnvironment("WHATSAPP_MESSAGES_PER_HOUR", 150),
    messagesPerDay: numberFromEnvironment("WHATSAPP_MESSAGES_PER_DAY", 600),
    /** Chats that never wrote to the broker, the main reason WhatsApp bans a number. */
    newChatsPerHour: numberFromEnvironment("WHATSAPP_NEW_CHATS_PER_HOUR", 10),
    newChatsPerDay: numberFromEnvironment("WHATSAPP_NEW_CHATS_PER_DAY", 30),
    /** How many different chats may get the very same text in one day. */
    sameTextChatsPerDay: numberFromEnvironment(
      "WHATSAPP_SAME_TEXT_CHATS_PER_DAY",
      5,
    ),
    /** A freshly linked number sends less while WhatsApp still watches it closely. */
    warmUpHours: numberFromEnvironment("WHATSAPP_WARM_UP_HOURS", 48),
    warmUpFactor: numberFromEnvironment("WHATSAPP_WARM_UP_FACTOR", 0.5),
    /** Messages waiting for their turn, above this new ones are refused. */
    maximumQueuedMessages: numberFromEnvironment(
      "WHATSAPP_MAXIMUM_QUEUED_MESSAGES",
      80,
    ),
    /** Failures in a row that pause the number, so a refusing WhatsApp is not hammered. */
    failuresBeforePause: numberFromEnvironment(
      "WHATSAPP_FAILURES_BEFORE_PAUSE",
      3,
    ),
    pauseMilliseconds: numberFromEnvironment(
      "WHATSAPP_PAUSE_MS",
      2 * 60 * 1000,
    ),
    /** Questions about other numbers (profile pictures, read receipts). */
    lookupsPerHour: numberFromEnvironment("WHATSAPP_LOOKUPS_PER_HOUR", 120),
    lookupDelayMinimumMilliseconds: numberFromEnvironment(
      "WHATSAPP_LOOKUP_DELAY_MINIMUM_MS",
      1_500,
    ),
    lookupDelayMaximumMilliseconds: numberFromEnvironment(
      "WHATSAPP_LOOKUP_DELAY_MAXIMUM_MS",
      3_500,
    ),
    /** Pairing attempts (QR codes) in a 15 minute window. */
    connectAttemptsPerWindow: numberFromEnvironment(
      "WHATSAPP_CONNECT_ATTEMPTS",
      5,
    ),
  },
}));
