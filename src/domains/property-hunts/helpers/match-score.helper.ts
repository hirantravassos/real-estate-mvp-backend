import { formatBrl } from "../../inbox/helpers/property-pitch.helper";
import { PropertyKindEnum } from "../../properties/mappers/property.mapper";
import {
  HuntAmenity,
  HuntCriteria,
  HuntTransaction,
} from "../types/hunt-criteria.type";
import { plainText } from "./text.helper";

/** The facts the score looks at, shared by portal listings and catalog properties. */
export interface MatchFacts {
  kind: PropertyKindEnum | null;
  transaction: HuntTransaction | null;
  price: number | null;
  maintenanceFee: number | null;
  /** Address, neighborhood and city together, to look for the wanted places. */
  location: string;
  bedrooms: number | null;
  suites: number | null;
  bathrooms: number | null;
  parkingSpaces: number | null;
  area: number | null;
  beachDistanceMeters: number | null;
  beachDistanceEstimated: boolean;
  /** Null means the source does not say which amenities it has. */
  amenities: HuntAmenity[] | null;
}

export interface MatchScore {
  score: number;
  highlights: string[];
  warnings: string[];
}

export const AMENITY_LABELS: Record<HuntAmenity, string> = {
  gym: "academia",
  pool: "piscina",
  balcony: "varanda",
  gourmet_balcony: "varanda gourmet",
  elevator: "elevador",
  concierge: "portaria",
  furnished: "mobiliado",
  air_conditioning: "ar condicionado",
  barbecue: "churrasqueira",
  playground: "playground",
  party_room: "salão de festas",
  pets_allowed: "aceita pet",
  sea_view: "vista para o mar",
};

const KIND_LABELS: Record<PropertyKindEnum, string> = {
  [PropertyKindEnum.APARTMENT]: "apartamento",
  [PropertyKindEnum.HOUSE]: "casa",
  [PropertyKindEnum.COMMERCIAL]: "imóvel comercial",
  [PropertyKindEnum.LAND]: "terreno",
};

/** Below this the listing is not worth the broker's time. */
export const MINIMUM_MATCH_SCORE = 40;
/** A hard requirement missed keeps the score under this. */
const MISSED_REQUIREMENT_CEILING = 45;

const MAXIMUM_HIGHLIGHTS = 10;
const MAXIMUM_WARNINGS = 5;

interface Check {
  weight: number;
  /** 1 met, 0 missed, between them partly met, null when unknown. */
  result: number | null;
  highlight?: string;
  warning?: string;
  unknownWarning?: string;
  hardRequirement?: boolean;
}

const atLeast = (
  value: number | null,
  minimum: number | null,
  weight: number,
  describe: (value: number) => string,
  missing: string,
): Check | null => {
  if (!minimum) return null;
  if (value === null) {
    return { weight, result: null, unknownWarning: missing };
  }
  if (value >= minimum) {
    return { weight, result: 1, highlight: describe(value) };
  }
  return {
    weight,
    result: 0,
    warning: `Tem ${describe(value)}, pediu ${minimum}`,
    hardRequirement: minimum - value >= 1,
  };
};

const priceCheck = (
  facts: MatchFacts,
  criteria: HuntCriteria,
): Check | null => {
  if (!criteria.maximumPrice && !criteria.minimumPrice) return null;
  if (!facts.price) {
    return { weight: 20, result: null, unknownWarning: "Não mostra o valor" };
  }
  const price = formatBrl(facts.price) ?? "";
  if (criteria.minimumPrice && facts.price < criteria.minimumPrice * 0.9) {
    return { weight: 20, result: 0.4, warning: `Abaixo da faixa: ${price}` };
  }
  if (!criteria.maximumPrice || facts.price <= criteria.maximumPrice) {
    return {
      weight: 20,
      result: 1,
      highlight: `${price}, dentro do orçamento`,
    };
  }
  const over = facts.price / criteria.maximumPrice - 1;
  if (over <= 0.05) {
    return { weight: 20, result: 0.6, warning: `Um pouco acima: ${price}` };
  }
  return {
    weight: 20,
    result: 0,
    warning: `Acima do orçamento: ${price}`,
    hardRequirement: over > 0.15,
  };
};

const locationCheck = (
  facts: MatchFacts,
  criteria: HuntCriteria,
): Check | null => {
  const location = plainText(facts.location);
  const neighborhoods = criteria.neighborhoods.filter(Boolean);
  if (neighborhoods.length) {
    if (!location) {
      return { weight: 15, result: null, unknownWarning: "Não diz o bairro" };
    }
    const found = neighborhoods.find((neighborhood) =>
      location.includes(plainText(neighborhood)),
    );
    return found
      ? { weight: 15, result: 1, highlight: `No ${found}` }
      : { weight: 15, result: 0, warning: "Fica fora dos bairros pedidos" };
  }
  if (criteria.city) {
    if (!location) return { weight: 6, result: null };
    return location.includes(plainText(criteria.city))
      ? { weight: 6, result: 1 }
      : { weight: 6, result: 0, warning: `Fora de ${criteria.city}` };
  }
  return null;
};

const maintenanceFeeCheck = (
  facts: MatchFacts,
  criteria: HuntCriteria,
): Check | null => {
  if (!criteria.maximumMaintenanceFee) return null;
  if (facts.maintenanceFee === null) {
    return {
      weight: 8,
      result: null,
      unknownWarning: "Não informa o condomínio",
    };
  }
  const fee = formatBrl(facts.maintenanceFee) ?? "sem condomínio";
  if (facts.maintenanceFee <= criteria.maximumMaintenanceFee) {
    return { weight: 8, result: 1, highlight: `Condomínio ${fee}` };
  }
  return facts.maintenanceFee <= criteria.maximumMaintenanceFee * 1.1
    ? { weight: 8, result: 0.5, warning: `Condomínio um pouco acima: ${fee}` }
    : { weight: 8, result: 0, warning: `Condomínio acima: ${fee}` };
};

const beachCheck = (
  facts: MatchFacts,
  criteria: HuntCriteria,
): Check | null => {
  if (!criteria.maximumBeachDistanceMeters) return null;
  if (facts.beachDistanceMeters === null) {
    return {
      weight: 10,
      result: null,
      unknownWarning: "Não dá para saber a distância da praia",
    };
  }
  const estimated = facts.beachDistanceEstimated ? " (estimado)" : "";
  const distance =
    facts.beachDistanceMeters >= 1000
      ? `${(facts.beachDistanceMeters / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`
      : `${Math.round(facts.beachDistanceMeters)} m`;
  if (facts.beachDistanceMeters <= criteria.maximumBeachDistanceMeters) {
    return {
      weight: 10,
      result: 1,
      highlight: `${distance} da praia${estimated}`,
    };
  }
  return facts.beachDistanceMeters <= criteria.maximumBeachDistanceMeters * 1.3
    ? {
        weight: 10,
        result: 0.5,
        warning: `${distance} da praia${estimated}, um pouco além`,
      }
    : { weight: 10, result: 0, warning: `${distance} da praia${estimated}` };
};

const areaCheck = (facts: MatchFacts, criteria: HuntCriteria): Check | null => {
  if (!criteria.minimumArea && !criteria.maximumArea) return null;
  if (!facts.area) {
    return { weight: 6, result: null, unknownWarning: "Não informa a área" };
  }
  const tooSmall = criteria.minimumArea && facts.area < criteria.minimumArea;
  const tooBig = criteria.maximumArea && facts.area > criteria.maximumArea;
  if (!tooSmall && !tooBig) {
    return { weight: 6, result: 1, highlight: `${facts.area} m²` };
  }
  return {
    weight: 6,
    result: 0,
    warning: `${facts.area} m², fora da metragem pedida`,
  };
};

const amenityChecks = (facts: MatchFacts, criteria: HuntCriteria): Check[] =>
  criteria.amenities.map((amenity) => {
    const label = AMENITY_LABELS[amenity];
    if (facts.amenities === null) {
      return { weight: 4, result: null, unknownWarning: `Confirmar ${label}` };
    }
    return facts.amenities.includes(amenity)
      ? { weight: 4, result: 1, highlight: `Tem ${label}` }
      : { weight: 4, result: 0.15, warning: `Não cita ${label}` };
  });

/**
 * Scores how well a property fits the hunt, from 0 to 100, and explains it
 * in short sentences. Unknown facts count half, so a listing that hides a
 * detail is not thrown away, only flagged for the broker to confirm.
 */
export const scoreMatch = (
  facts: MatchFacts,
  criteria: HuntCriteria,
  wishScore: number | null = null,
): MatchScore => {
  const checks: (Check | null)[] = [
    priceCheck(facts, criteria),
    locationCheck(facts, criteria),
    criteria.kind
      ? facts.kind === null
        ? { weight: 8, result: null }
        : facts.kind === criteria.kind
          ? { weight: 8, result: 1 }
          : {
              weight: 8,
              result: 0,
              warning: `É ${KIND_LABELS[facts.kind]}`,
              hardRequirement: true,
            }
      : null,
    atLeast(
      facts.bedrooms,
      criteria.minimumBedrooms,
      12,
      (value) => `${value} quarto${value === 1 ? "" : "s"}`,
      "Não informa os quartos",
    ),
    atLeast(
      facts.suites,
      criteria.minimumSuites,
      8,
      (value) => `${value} suíte${value === 1 ? "" : "s"}`,
      "Não informa se tem suíte",
    ),
    atLeast(
      facts.bathrooms,
      criteria.minimumBathrooms,
      4,
      (value) => `${value} banheiro${value === 1 ? "" : "s"}`,
      "Não informa os banheiros",
    ),
    atLeast(
      facts.parkingSpaces,
      criteria.minimumParkingSpaces,
      8,
      (value) => `${value} vaga${value === 1 ? "" : "s"} de garagem`,
      "Não informa a vaga de garagem",
    ),
    areaCheck(facts, criteria),
    maintenanceFeeCheck(facts, criteria),
    beachCheck(facts, criteria),
    ...amenityChecks(facts, criteria),
    criteria.extraWishes.length && wishScore !== null
      ? {
          weight: 8,
          result: Math.min(1, Math.max(0, wishScore / 100)),
        }
      : null,
  ];

  const active = checks.filter((check): check is Check => Boolean(check));
  const totalWeight = active.reduce((sum, check) => sum + check.weight, 0);
  const earned = active.reduce(
    (sum, check) => sum + check.weight * (check.result ?? 0.5),
    0,
  );

  let score = totalWeight ? Math.round((earned / totalWeight) * 100) : 70;
  if (active.some((check) => check.hardRequirement)) {
    score = Math.min(score, MISSED_REQUIREMENT_CEILING);
  }
  if (facts.transaction && facts.transaction !== criteria.transaction) {
    score = Math.min(score, 10);
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    highlights: active
      .filter((check) => check.highlight)
      .map((check) => check.highlight as string)
      .slice(0, MAXIMUM_HIGHLIGHTS),
    warnings: [
      ...active.filter((check) => check.warning).map((check) => check.warning),
      ...active
        .filter((check) => check.result === null && check.unknownWarning)
        .map((check) => check.unknownWarning),
    ]
      .filter((warning): warning is string => Boolean(warning))
      .slice(0, MAXIMUM_WARNINGS),
  };
};
