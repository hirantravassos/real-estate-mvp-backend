import type { ConfigType } from "@nestjs/config";
import { subscriptionsConfig } from "../../../config/subscriptions.config";
import {
  PlanLimitResource,
  SubscriptionPlanKey,
} from "../enums/subscription.enum";

/** Null means no limit. */
export type PlanLimits = Record<PlanLimitResource, number | null>;

export interface SubscriptionPlan {
  key: SubscriptionPlanKey;
  name: string;
  tagline: string;
  priceInBrl: number;
  monthlyCredits: number;
  highlight: boolean;
  limits: PlanLimits;
  features: string[];
}

/** The free trial opens the recommended plan, so the broker sees the best of it. */
export const TRIAL_PLAN_KEY = SubscriptionPlanKey.RECOMMENDED;

const PLAN_ORDER = [
  SubscriptionPlanKey.BASIC,
  SubscriptionPlanKey.RECOMMENDED,
  SubscriptionPlanKey.PREMIUM,
];

const formatCount = (value: number) => value.toLocaleString("pt-BR");

const PLAN_DEFINITIONS: Record<
  SubscriptionPlanKey,
  Omit<
    SubscriptionPlan,
    "key" | "priceInBrl" | "monthlyCredits" | "features"
  > & {
    features: (monthlyCredits: number) => string[];
  }
> = {
  [SubscriptionPlanKey.BASIC]: {
    name: "Básico",
    tagline: "Para organizar a carteira e atender rápido no WhatsApp.",
    highlight: false,
    limits: {
      [PlanLimitResource.CUSTOMERS]: 300,
      [PlanLimitResource.PROPERTIES]: 50,
      [PlanLimitResource.OPEN_DEALS]: 5,
      [PlanLimitResource.PROPERTY_HUNTS_PER_MONTH]: 0,
    },
    features: (monthlyCredits) => [
      `${formatCount(monthlyCredits)} créditos de IA todo mês`,
      "Até 300 clientes e 50 imóveis",
      "Inbox do WhatsApp com respostas sugeridas pela IA",
      "Funil de vendas, agenda de visitas e lembretes",
      "Página pública do corretor e de cada imóvel",
      "Até 5 negociações abertas na sala de fechamento",
      "Assistente de IA, busca de proprietários e certidões",
    ],
  },
  [SubscriptionPlanKey.RECOMMENDED]: {
    name: "Profissional",
    tagline: "Para quem vive de atendimento e quer a IA trabalhando junto.",
    highlight: true,
    limits: {
      [PlanLimitResource.CUSTOMERS]: 2000,
      [PlanLimitResource.PROPERTIES]: 300,
      [PlanLimitResource.OPEN_DEALS]: null,
      [PlanLimitResource.PROPERTY_HUNTS_PER_MONTH]: 20,
    },
    features: (monthlyCredits) => [
      `${formatCount(monthlyCredits)} créditos de IA todo mês`,
      "Tudo do Básico",
      "Até 2.000 clientes e 300 imóveis",
      "Negociações sem limite, com portal do cliente e assinaturas",
      "Caça imóveis com IA nos portais, 20 buscas por mês",
      "Importação de contatos do WhatsApp e do Google",
    ],
  },
  [SubscriptionPlanKey.PREMIUM]: {
    name: "Premium",
    tagline: "Para carteiras grandes e quem não quer pensar em limite.",
    highlight: false,
    limits: {
      [PlanLimitResource.CUSTOMERS]: null,
      [PlanLimitResource.PROPERTIES]: null,
      [PlanLimitResource.OPEN_DEALS]: null,
      [PlanLimitResource.PROPERTY_HUNTS_PER_MONTH]: null,
    },
    features: (monthlyCredits) => [
      `${formatCount(monthlyCredits)} créditos de IA todo mês`,
      "Tudo do Profissional",
      "Clientes, imóveis e negociações sem limite",
      "Caça imóveis com IA sem limite de buscas",
      "Suporte prioritário",
    ],
  },
};

/** Prices and monthly credits come from the environment, the rest is fixed. */
export const buildSubscriptionPlans = (
  configuration: ConfigType<typeof subscriptionsConfig>,
): SubscriptionPlan[] =>
  PLAN_ORDER.map((key) => {
    const definition = PLAN_DEFINITIONS[key];
    const pricing = configuration.plans[key];
    return {
      key,
      name: definition.name,
      tagline: definition.tagline,
      priceInBrl: Math.round(pricing.priceInBrl * 100) / 100,
      monthlyCredits: pricing.monthlyCredits,
      highlight: definition.highlight,
      limits: { ...definition.limits },
      features: definition.features(pricing.monthlyCredits),
    };
  });

export const isSubscriptionPlanKey = (
  value: unknown,
): value is SubscriptionPlanKey =>
  PLAN_ORDER.includes(value as SubscriptionPlanKey);
