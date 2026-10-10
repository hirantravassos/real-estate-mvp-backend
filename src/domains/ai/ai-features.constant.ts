export type AiFeature = "reply_suggestions" | "rewrite" | "presentation";

export interface AiFeatureDefinition {
  label: string;
  maximumOutputTokens: number;
  /** A usual call, used to show the broker how many credits it costs. */
  typicalInputTokens: number;
  typicalOutputTokens: number;
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
};
