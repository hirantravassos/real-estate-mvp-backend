/**
 * What can happen to a customer: stays where it is, goes to another stage
 * of the funnel, leaves the funnel as lost or is deleted.
 */
export const RECLASSIFICATION_ACTIONS = [
  "keep",
  "move",
  "lost",
  "delete",
] as const;
export type ReclassificationAction = (typeof RECLASSIFICATION_ACTIONS)[number];

/** Only the actions that change something are sent to be applied. */
export const APPLICABLE_ACTIONS = ["move", "lost", "delete"] as const;
export type ApplicableAction = (typeof APPLICABLE_ACTIONS)[number];

export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

/** How warm the lead is, read from the conversation by the AI. */
export const LEAD_TEMPERATURES = ["hot", "warm", "cooling", "cold"] as const;
export type LeadTemperature = (typeof LEAD_TEMPERATURES)[number];

/** Days without any conversation or note before a lead counts as abandoned. */
export const ABANDONED_AFTER_DAYS = 60;

/** Starts the note written on the customer's history by a reclassification. */
export const RECLASSIFICATION_NOTE_PREFIX = "🤖 Reclassificação";

export const isReclassificationNote = (comment: string | null | undefined) =>
  Boolean(comment?.startsWith(RECLASSIFICATION_NOTE_PREFIX));

const REASON_LIMIT = 200;
const SUMMARY_LIMIT = 400;

export interface ReclassificationSuggestion {
  customerId: string;
  /** False when there was nothing to read; such customers are not charged. */
  analyzed: boolean;
  action: ReclassificationAction;
  /** The stage it goes to when moving, the current one when kept. */
  kanbanId: string | null;
  confidence: ConfidenceLevel;
  temperature: LeadTemperature;
  reason: string;
  /** Where the negotiation stands, for the customer's history. */
  summary: string | null;
}

/** What the server knows for sure, it wins over what the AI suggested. */
export interface ReclassificationFacts {
  customerId: string;
  currentKanbanId: string | null;
  hasOpenDeal: boolean;
  hasUpcomingVisit: boolean;
  /** Days since the last message, note or past visit. */
  daysSinceContact: number | null;
  daysSinceCreated: number;
}

export interface RawSuggestion {
  index?: number;
  action?: string;
  stageId?: string | null;
  confidence?: string;
  temperature?: string;
  reason?: string;
  summary?: string | null;
}

const PROTECTED_REASON =
  "Tem fechamento em andamento ou visita marcada, fica onde está.";

const isProtected = (facts: ReclassificationFacts) =>
  facts.hasOpenDeal || facts.hasUpcomingVisit;

const pick = <Value extends string>(
  options: readonly Value[],
  value: string | undefined,
  fallback: Value,
): Value => (options.includes(value as Value) ? (value as Value) : fallback);

const temperatureByDays = (days: number | null): LeadTemperature => {
  if (days === null) return "cold";
  if (days <= 2) return "hot";
  if (days <= 7) return "warm";
  if (days <= 21) return "cooling";
  return "cold";
};

const kept = (
  facts: ReclassificationFacts,
  suggestion: Omit<ReclassificationSuggestion, "action" | "kanbanId">,
): ReclassificationSuggestion => ({
  ...suggestion,
  action: "keep",
  kanbanId: facts.currentKanbanId,
});

/**
 * For customers with nothing to read (no message, note or visit): only how
 * long they have been sitting in the funnel says something.
 */
export const suggestionWithoutHistory = (
  facts: ReclassificationFacts,
): ReclassificationSuggestion => {
  const base = {
    customerId: facts.customerId,
    analyzed: false,
    confidence: "low" as const,
    temperature: temperatureByDays(facts.daysSinceContact),
    summary: null,
  };

  if (!isProtected(facts) && facts.daysSinceCreated >= ABANDONED_AFTER_DAYS) {
    return {
      ...base,
      action: "lost",
      kanbanId: null,
      reason: `Nenhuma conversa ou anotação em ${facts.daysSinceCreated} dias desde o cadastro.`,
    };
  }

  return kept(facts, {
    ...base,
    reason: isProtected(facts)
      ? PROTECTED_REASON
      : "Ainda sem conversa ou anotação para a IA avaliar.",
  });
};

/**
 * Turns what the AI answered into a suggestion the app can apply: unknown
 * stages are ignored, customers with an open deal or a visit ahead are never
 * lost or deleted, and an unsure delete becomes lost, which can be undone.
 */
export const suggestionFromAi = (
  facts: ReclassificationFacts,
  raw: RawSuggestion,
  stageIds: Set<string>,
): ReclassificationSuggestion => {
  const confidence = pick(CONFIDENCE_LEVELS, raw.confidence, "low");
  const base = {
    customerId: facts.customerId,
    analyzed: true,
    confidence,
    temperature: pick(
      LEAD_TEMPERATURES,
      raw.temperature,
      temperatureByDays(facts.daysSinceContact),
    ),
    reason: (raw.reason ?? "").trim().substring(0, REASON_LIMIT),
    summary: raw.summary?.trim().substring(0, SUMMARY_LIMIT) || null,
  };
  let action = pick(RECLASSIFICATION_ACTIONS, raw.action, "keep");

  if ((action === "lost" || action === "delete") && isProtected(facts)) {
    return kept(facts, { ...base, reason: PROTECTED_REASON });
  }

  if (action === "delete" && confidence === "low") action = "lost";

  if (action === "move") {
    const stageId = raw.stageId ?? null;
    if (!stageId || !stageIds.has(stageId)) return kept(facts, base);
    if (stageId === facts.currentKanbanId) return kept(facts, base);
    return { ...base, action, kanbanId: stageId };
  }

  if (action === "keep") return kept(facts, base);
  return { ...base, action, kanbanId: null };
};
