export type AiFeature =
  | "reply_suggestions"
  | "rewrite"
  | "presentation"
  | "contact_import"
  | "avatar_from_photo"
  | "hunt_criteria"
  | "hunt_conversation"
  | "hunt_listing";

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
  hunt_criteria: {
    label: "Caça imóveis: entender o pedido",
    maximumOutputTokens: 1400,
    typicalInputTokens: 1200,
    typicalOutputTokens: 500,
  },
  hunt_conversation: {
    label: "Caça imóveis: perfil pela conversa",
    maximumOutputTokens: 2000,
    typicalInputTokens: 4000,
    typicalOutputTokens: 800,
  },
  /** Priced per listing read: one listing's share of a batch call. */
  hunt_listing: {
    label: "Caça imóveis com IA",
    maximumOutputTokens: 6000,
    typicalInputTokens: 3800,
    typicalOutputTokens: 900,
    fixedPriceSafetyMultiplier: 1.5,
  },
};
