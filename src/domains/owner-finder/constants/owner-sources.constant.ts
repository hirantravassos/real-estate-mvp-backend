export type OwnerSourceKind = "owner_portal" | "classifieds" | "portal";

export interface OwnerContactSource {
  key: string;
  name: string;
  /** Written without https, it is also the web search filter. */
  domain: string;
  kind: OwnerSourceKind;
  /** Shown under the link, what the broker finds about the owner there. */
  hint: string;
}

/**
 * Brazilian sites where owners publish their own contact on the ad. Owner
 * portals only take ads from owners; on the others only the ads posted by
 * private sellers count, never the ones of brokers or agencies.
 */
export const OWNER_CONTACT_SOURCES: readonly OwnerContactSource[] = [
  {
    key: "proprietario_direto",
    name: "Proprietário Direto",
    domain: "proprietariodireto.com.br",
    kind: "owner_portal",
    hint: "Só donos anunciam, o contato é sempre do proprietário.",
  },
  {
    key: "apartamento_livre",
    name: "Apartamento Livre",
    domain: "apartamentolivre.com.br",
    kind: "owner_portal",
    hint: "Anúncio direto com o dono, com telefone.",
  },
  {
    key: "seu_imovel_direto",
    name: "Seu Imóvel Direto",
    domain: "seuimoveldireto.com.br",
    kind: "owner_portal",
    hint: "Proprietários do Brasil todo, contato no anúncio.",
  },
  {
    key: "olx",
    name: "OLX",
    domain: "olx.com.br",
    kind: "classifieds",
    hint: "Só vale anúncio com selo Particular.",
  },
  {
    key: "mercado_livre",
    name: "Mercado Livre Imóveis",
    domain: "mercadolivre.com.br",
    kind: "classifieds",
    hint: "Só vale vendedor pessoa física.",
  },
  {
    key: "zap",
    name: "Zap Imóveis",
    domain: "zapimoveis.com.br",
    kind: "portal",
    hint: "Só vale anúncio marcado como proprietário.",
  },
  {
    key: "viva_real",
    name: "VivaReal",
    domain: "vivareal.com.br",
    kind: "portal",
    hint: "Só vale anúncio marcado como proprietário.",
  },
  {
    key: "imovelweb",
    name: "Imovelweb",
    domain: "imovelweb.com.br",
    kind: "portal",
    hint: "Só vale anúncio “direto com o proprietário”.",
  },
];

export interface OwnerRegistrySource {
  key: string;
  name: string;
  url: string;
  hint: string;
  /** Only shown when the location mentions one of these words. */
  onlyFor?: readonly string[];
  /**
   * Postal code ranges of the city, by the first five digits. When the
   * address has a postal code they decide instead of the words, since the
   * state name can match a city name.
   */
  postalCodeRanges?: readonly (readonly [number, number])[];
}

/**
 * Official places that tell who owns a property. They do not give a phone,
 * but the registry record (matrícula) has the owner's name.
 */
export const OWNER_REGISTRY_SOURCES: readonly OwnerRegistrySource[] = [
  {
    key: "onr_map",
    name: "Mapa do Registro de Imóveis (ONR)",
    url: "https://mapa.onr.org.br",
    hint: "Pelo endereço, mostra o cartório e o número da matrícula.",
  },
  {
    key: "ri_digital",
    name: "RI Digital, visualizar matrícula",
    url: "https://ridigital.org.br",
    hint: "Com cartório e matrícula, mostra o nome do dono (pago, por consulta).",
  },
  {
    key: "santos_mapeada",
    name: "Santos Mapeada",
    url: "https://egov.santos.sp.gov.br/santosmapeada/",
    hint: "Mapa de lotes e cadastro imobiliário de Santos.",
    onlyFor: ["santos"],
    postalCodeRanges: [[11000, 11099]],
  },
  {
    key: "geosampa",
    name: "GeoSampa",
    url: "https://geosampa.prefeitura.sp.gov.br",
    hint: "Mapa de lotes e IPTU da cidade de São Paulo.",
    onlyFor: ["são paulo", "sao paulo"],
    postalCodeRanges: [
      [1000, 5999],
      [8000, 8499],
    ],
  },
];

/** Phrases owners use in their ads, they keep the brokers out of the results. */
export const OWNER_SEARCH_PHRASES = [
  "direto com o proprietário",
  "direto com o dono",
  "particular",
  "sem corretor",
];
