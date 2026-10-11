export type AiFeature =
  | "reply_suggestions"
  | "rewrite"
  | "presentation"
  | "contact_import"
  | "avatar_from_photo"
  | "assistant"
  | "assistant_voice";

export interface AiFeatureDefinition {
  label: string;
  maximumOutputTokens: number;
  /** A usual call, used to show the broker how many credits it costs. */
  typicalInputTokens: number;
  typicalOutputTokens: number;
  /**
   * Set for features sold at a fixed price instead of the tokens used.
   * The typical tokens are then the most one call can use (the input is
   * trimmed to fit) and the price is raised by this factor, so the fixed
   * price always covers the real cost.
   */
  fixedPriceSafetyMultiplier?: number;
  /** For features not billed by chat tokens, like turning audio into text. */
  typicalCostInUsd?: number;
}

export const AI_FEATURES: Record<AiFeature, AiFeatureDefinition> = {
  reply_suggestions: {
    label: "Sugestões de resposta",
    maximumOutputTokens: 1600,
    typicalInputTokens: 2500,
    typicalOutputTokens: 700,
  },
  rewrite: {
    label: "Melhorar mensagem",
    maximumOutputTokens: 1000,
    typicalInputTokens: 900,
    typicalOutputTokens: 400,
  },
  presentation: {
    label: "Apresentação de imóvel",
    maximumOutputTokens: 2400,
    typicalInputTokens: 2500,
    typicalOutputTokens: 1200,
  },
  /** Priced per contact: one contact's share of a batch call. */
  contact_import: {
    label: "Importar contatos com IA",
    maximumOutputTokens: 4000,
    typicalInputTokens: 1600,
    typicalOutputTokens: 350,
    fixedPriceSafetyMultiplier: 1.5,
  },
  /** Priced per photo: a small picture in low detail and a short answer. */
  avatar_from_photo: {
    label: "Bonequinho pela foto do WhatsApp",
    maximumOutputTokens: 600,
    typicalInputTokens: 1000,
    typicalOutputTokens: 250,
    fixedPriceSafetyMultiplier: 1.5,
  },
  /**
   * One question to the assistant, billed once for every step it took. The
   * output limit is per step, the typical tokens are the whole question with
   * a couple of lookups.
   */
  assistant: {
    label: "Assistente",
    maximumOutputTokens: 2000,
    typicalInputTokens: 14000,
    typicalOutputTokens: 1500,
  },
  /** About one minute of voice turned into text. */
  assistant_voice: {
    label: "Áudio para o assistente",
    maximumOutputTokens: 0,
    typicalInputTokens: 0,
    typicalOutputTokens: 0,
    typicalCostInUsd: 0.006,
  },
};
