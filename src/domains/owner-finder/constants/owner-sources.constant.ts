export type OwnerSourceKind = "owner_portal" | "classifieds" | "portal";

export interface OwnerListingSource {
  key: string;
  name: string;
  /** Written without https, it is also the web search filter. */
  domain: string;
  kind: OwnerSourceKind;
  /** Shown under the link so the broker knows what to expect there. */
  hint: string;
}

/**
 * Brazilian sites where owners advertise their own properties. Owner
 * portals only take ads from owners; on the others the AI and the search
 * words pick the ads posted by private sellers.
 */
export const OWNER_LISTING_SOURCES: readonly OwnerListingSource[] = [
  {
    key: "proprietario_direto",
    name: "Proprietário Direto",
    domain: "proprietariodireto.com.br",
    kind: "owner_portal",
    hint: "Só anúncios de donos, sem corretor.",
  },
  {
    key: "apartamento_livre",
    name: "Apartamento Livre",
    domain: "apartamentolivre.com.br",
    kind: "owner_portal",
    hint: "Venda e aluguel direto com o dono.",
  },
  {
    key: "seu_imovel_direto",
    name: "Seu Imóvel Direto",
    domain: "seuimoveldireto.com.br",
    kind: "owner_portal",
    hint: "Anúncios de proprietários do Brasil todo.",
  },
  {
    key: "olx",
    name: "OLX",
    domain: "olx.com.br",
    kind: "classifieds",
    hint: "Procure o selo Particular no anúncio.",
  },
  {
    key: "mercado_livre",
    name: "Mercado Livre Imóveis",
    domain: "mercadolivre.com.br",
    kind: "classifieds",
    hint: "Muitos vendedores pessoa física.",
  },
  {
    key: "zap",
    name: "Zap Imóveis",
    domain: "zapimoveis.com.br",
    kind: "portal",
    hint: "Maioria imobiliária, filtre por proprietário.",
  },
  {
    key: "viva_real",
    name: "VivaReal",
    domain: "vivareal.com.br",
    kind: "portal",
    hint: "Maioria imobiliária, filtre por proprietário.",
  },
  {
    key: "imovelweb",
    name: "Imovelweb",
    domain: "imovelweb.com.br",
    kind: "portal",
    hint: "Busque por “direto com o proprietário”.",
  },
];

export interface OwnerRegistrySource {
  key: string;
  name: string;
  url: string;
  hint: string;
  /** Only shown when the location mentions one of these words. */
  onlyFor?: readonly string[];
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
  },
  {
    key: "geosampa",
    name: "GeoSampa",
    url: "https://geosampa.prefeitura.sp.gov.br",
    hint: "Mapa de lotes e IPTU da cidade de São Paulo.",
    onlyFor: ["são paulo", "sao paulo"],
  },
];

/** Phrases owners use in their ads, they keep the brokers out of the results. */
export const OWNER_SEARCH_PHRASES = [
  "direto com o proprietário",
  "direto com o dono",
  "particular",
  "sem corretor",
];
