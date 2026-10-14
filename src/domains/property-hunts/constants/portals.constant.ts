import { PropertyKindEnum } from "../../properties/mappers/property.mapper";
import { PortalKey } from "../enums/property-hunt.enum";
import { slugify } from "../helpers/text.helper";
import { HuntCriteria } from "../types/hunt-criteria.type";

export interface PortalDefinition {
  key: PortalKey;
  label: string;
  homeUrl: string;
  /** Recognizes the link of a single listing among the search results. */
  listingUrlPattern: RegExp;
  /** Best effort search link, the AI reads and filters what comes back. */
  buildSearchUrl: (criteria: HuntCriteria) => string;
}

const firstNeighborhood = (criteria: HuntCriteria) =>
  criteria.neighborhoods[0] ?? null;

const kindSlug = (
  kind: PropertyKindEnum | null,
  names: Record<PropertyKindEnum | "any", string>,
) => names[kind ?? "any"];

const withQuery = (
  base: string,
  query: Record<string, string | number | null | undefined>,
) => {
  const parameters = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;
    parameters.set(key, String(value));
  }
  const text = parameters.toString();
  return text ? `${base}?${text}` : base;
};

/** The listing marketplaces scanned by the hunts, the biggest ones in Brazil. */
export const PORTALS: Record<PortalKey, PortalDefinition> = {
  [PortalKey.ZAP_IMOVEIS]: {
    key: PortalKey.ZAP_IMOVEIS,
    label: "ZAP Imóveis",
    homeUrl: "https://www.zapimoveis.com.br/",
    listingUrlPattern: /zapimoveis\.com\.br\/imovel\/[^?#]+/i,
    buildSearchUrl: (criteria) => {
      const transaction = criteria.transaction === "rent" ? "aluguel" : "venda";
      const kind = kindSlug(criteria.kind, {
        [PropertyKindEnum.APARTMENT]: "apartamentos",
        [PropertyKindEnum.HOUSE]: "casas",
        [PropertyKindEnum.COMMERCIAL]: "comercial",
        [PropertyKindEnum.LAND]: "terrenos-lotes-condominios",
        any: "imoveis",
      });
      const place = [
        slugify(criteria.state),
        slugify(criteria.city),
        "",
        slugify(firstNeighborhood(criteria)),
      ]
        .join("+")
        .replace(/\++$/, "");
      return withQuery(
        `https://www.zapimoveis.com.br/${transaction}/${kind}/${place}/`,
        {
          precoMaximo: criteria.maximumPrice,
          precoMinimo: criteria.minimumPrice,
          quartos: criteria.minimumBedrooms,
          vagas: criteria.minimumParkingSpaces,
        },
      );
    },
  },
  [PortalKey.VIVA_REAL]: {
    key: PortalKey.VIVA_REAL,
    label: "Viva Real",
    homeUrl: "https://www.vivareal.com.br/",
    listingUrlPattern: /vivareal\.com\.br\/imovel\/[^?#]+/i,
    buildSearchUrl: (criteria) => {
      const transaction = criteria.transaction === "rent" ? "aluguel" : "venda";
      const kind = kindSlug(criteria.kind, {
        [PropertyKindEnum.APARTMENT]: "apartamento_residencial",
        [PropertyKindEnum.HOUSE]: "casa_residencial",
        [PropertyKindEnum.COMMERCIAL]: "comercial",
        [PropertyKindEnum.LAND]: "lote-terreno_residencial",
        any: "",
      });
      const neighborhood = firstNeighborhood(criteria);
      const path = [
        transaction,
        slugify(criteria.state),
        slugify(criteria.city),
        neighborhood ? `bairros/${slugify(neighborhood)}` : "",
        kind,
      ]
        .filter(Boolean)
        .join("/");
      return withQuery(`https://www.vivareal.com.br/${path}/`, {
        precoMaximo: criteria.maximumPrice,
        precoMinimo: criteria.minimumPrice,
        quartos: criteria.minimumBedrooms,
        vagas: criteria.minimumParkingSpaces,
      });
    },
  },
  [PortalKey.QUINTO_ANDAR]: {
    key: PortalKey.QUINTO_ANDAR,
    label: "QuintoAndar",
    homeUrl: "https://www.quintoandar.com.br/",
    listingUrlPattern: /quintoandar\.com\.br\/imovel\/\d+/i,
    buildSearchUrl: (criteria) => {
      const transaction =
        criteria.transaction === "rent" ? "alugar" : "comprar";
      const place = [
        firstNeighborhood(criteria),
        criteria.city,
        criteria.state,
        "brasil",
      ]
        .filter(Boolean)
        .map(slugify)
        .join("-");
      const kind = kindSlug(criteria.kind, {
        [PropertyKindEnum.APARTMENT]: "/apartamento",
        [PropertyKindEnum.HOUSE]: "/casa",
        [PropertyKindEnum.COMMERCIAL]: "",
        [PropertyKindEnum.LAND]: "",
        any: "",
      });
      return `https://www.quintoandar.com.br/${transaction}/imovel/${place}${kind}`;
    },
  },
  [PortalKey.OLX]: {
    key: PortalKey.OLX,
    label: "OLX",
    homeUrl: "https://www.olx.com.br/",
    listingUrlPattern: /olx\.com\.br\/[^?#]*imoveis\/[^?#/]+-\d{6,}/i,
    buildSearchUrl: (criteria) => {
      const transaction = criteria.transaction === "rent" ? "aluguel" : "venda";
      const kind = kindSlug(criteria.kind, {
        [PropertyKindEnum.APARTMENT]: "/apartamentos",
        [PropertyKindEnum.HOUSE]: "/casas",
        [PropertyKindEnum.COMMERCIAL]: "/comercio-e-industria",
        [PropertyKindEnum.LAND]: "/terrenos",
        any: "",
      });
      const state = criteria.state ? `/estado-${slugify(criteria.state)}` : "";
      return withQuery(
        `https://www.olx.com.br/imoveis/${transaction}${kind}${state}`,
        {
          q: [firstNeighborhood(criteria), criteria.city]
            .filter(Boolean)
            .join(" "),
          pe: criteria.maximumPrice,
          ps: criteria.minimumPrice,
          ros: criteria.minimumBedrooms,
          gsp: criteria.minimumParkingSpaces,
        },
      );
    },
  },
  [PortalKey.CHAVES_NA_MAO]: {
    key: PortalKey.CHAVES_NA_MAO,
    label: "Chaves na Mão",
    homeUrl: "https://www.chavesnamao.com.br/",
    listingUrlPattern: /chavesnamao\.com\.br\/imovel\/[^?#]+/i,
    buildSearchUrl: (criteria) => {
      const transaction =
        criteria.transaction === "rent" ? "para-alugar" : "a-venda";
      const kind = kindSlug(criteria.kind, {
        [PropertyKindEnum.APARTMENT]: "apartamentos",
        [PropertyKindEnum.HOUSE]: "casas",
        [PropertyKindEnum.COMMERCIAL]: "imoveis-comerciais",
        [PropertyKindEnum.LAND]: "terrenos",
        any: "imoveis",
      });
      const place = [
        [slugify(criteria.state), slugify(criteria.city)]
          .filter(Boolean)
          .join("-"),
        slugify(firstNeighborhood(criteria)),
      ]
        .filter(Boolean)
        .join("/");
      return `https://www.chavesnamao.com.br/${kind}-${transaction}/${place}/`;
    },
  },
  [PortalKey.IMOVELWEB]: {
    key: PortalKey.IMOVELWEB,
    label: "Imovelweb",
    homeUrl: "https://www.imovelweb.com.br/",
    listingUrlPattern: /imovelweb\.com\.br\/propriedades\/[^?#]+/i,
    buildSearchUrl: (criteria) => {
      const transaction = criteria.transaction === "rent" ? "aluguel" : "venda";
      const kind = kindSlug(criteria.kind, {
        [PropertyKindEnum.APARTMENT]: "apartamentos",
        [PropertyKindEnum.HOUSE]: "casas",
        [PropertyKindEnum.COMMERCIAL]: "comerciais",
        [PropertyKindEnum.LAND]: "terrenos",
        any: "imoveis",
      });
      const place = [firstNeighborhood(criteria), criteria.city]
        .filter(Boolean)
        .map(slugify)
        .join("-");
      return `https://www.imovelweb.com.br/${kind}-${transaction}${place ? `-${place}` : ""}.html`;
    },
  },
};

export const PORTAL_KEYS = Object.values(PortalKey);

/**
 * Hunting on the listing portals reads only the public pages, signed out:
 * no platform account, no "ver telefone" click. The broker opens the listing
 * on the portal, in their own browser, to talk to the advertiser.
 */
export const PORTAL_SEARCH_ENABLED = true;

/**
 * The paid AI search of owner ads. Off: it needs the advertiser's phone,
 * which the platform no longer collects. The free links stay.
 */
export const OWNER_CONTACT_SEARCH_ENABLED = false;

/**
 * Days a portal suggestion and a listing shortcut are kept. Listings go
 * stale, and the Privacy Policy promises this limit.
 */
export const LISTING_RETENTION_DAYS = 90;
