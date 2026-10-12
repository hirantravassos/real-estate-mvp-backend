export type AiFeature =
  | "reply_suggestions"
  | "rewrite"
  | "presentation"
  | "contact_import"
  | "customer_reclassification"
  | "avatar_from_photo"
  | "hunt_criteria"
  | "hunt_conversation"
  | "hunt_listing"
  | "assistant"
  | "assistant_voice"
  | "owner_search";

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
  /** Web searches a usual call runs, for features that search the web. */
  typicalWebSearchCalls?: number;
  /**
   * The balance asked before a call, as a multiple of a usual call. Set
   * for calls whose real size is only known after they run.
   */
  reserveMultiplier?: number;
  /**
   * Adds the broker's profile and AI memory to the instructions, for the
   * features that write for the broker or pick things on their behalf.
   */
  usesBrokerContext?: boolean;
}

export const AI_FEATURES: Record<AiFeature, AiFeatureDefinition> = {
  reply_suggestions: {
    label: "Sugestões de resposta",
    usesBrokerContext: true,
    maximumOutputTokens: 1600,
    typicalInputTokens: 2500,
    typicalOutputTokens: 700,
  },
  rewrite: {
    label: "Melhorar mensagem",
    usesBrokerContext: true,
    maximumOutputTokens: 1000,
    typicalInputTokens: 900,
    typicalOutputTokens: 400,
  },
  presentation: {
    label: "Apresentação de imóvel",
    usesBrokerContext: true,
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
  /**
   * Priced per customer: one customer's share of a batch call, with the
   * conversation, the notes and the funnel stages.
   */
  customer_reclassification: {
    label: "Reclassificar clientes com IA",
    usesBrokerContext: true,
    maximumOutputTokens: 4000,
    typicalInputTokens: 2200,
    typicalOutputTokens: 300,
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
    usesBrokerContext: true,
    maximumOutputTokens: 1400,
    typicalInputTokens: 1200,
    typicalOutputTokens: 500,
  },
  hunt_conversation: {
    label: "Caça imóveis: perfil pela conversa",
    usesBrokerContext: true,
    maximumOutputTokens: 2000,
    typicalInputTokens: 4000,
    typicalOutputTokens: 800,
  },
  /** Priced per listing read: one listing's share of a batch call. */
  hunt_listing: {
    label: "Caça imóveis com IA",
    usesBrokerContext: true,
    maximumOutputTokens: 6000,
    typicalInputTokens: 3800,
    typicalOutputTokens: 900,
    fixedPriceSafetyMultiplier: 1.5,
  },
  /**
   * One question to the assistant, billed once for every step it took. The
   * output limit is per step, the typical tokens are the whole question with
   * a couple of lookups.
   */
  assistant: {
    label: "Assistente",
    usesBrokerContext: true,
    /** Room for a whole document written in one step. */
    maximumOutputTokens: 8000,
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
  /** Looks for the owner contact of one property on the listing sites. */
  owner_search: {
    label: "Contato do proprietário",
    maximumOutputTokens: 6000,
    typicalInputTokens: 30000,
    typicalOutputTokens: 3000,
    typicalWebSearchCalls: 4,
    reserveMultiplier: 3,
  },
};
