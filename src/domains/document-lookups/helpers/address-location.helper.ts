const BRAZILIAN_STATES: Record<string, string> = {
  acre: "AC",
  alagoas: "AL",
  amapa: "AP",
  amazonas: "AM",
  bahia: "BA",
  ceara: "CE",
  "distrito federal": "DF",
  "espirito santo": "ES",
  goias: "GO",
  maranhao: "MA",
  "mato grosso": "MT",
  "mato grosso do sul": "MS",
  "minas gerais": "MG",
  para: "PA",
  paraiba: "PB",
  parana: "PR",
  pernambuco: "PE",
  piaui: "PI",
  "rio de janeiro": "RJ",
  "rio grande do norte": "RN",
  "rio grande do sul": "RS",
  rondonia: "RO",
  roraima: "RR",
  "santa catarina": "SC",
  "sao paulo": "SP",
  sergipe: "SE",
  tocantins: "TO",
};

const STATE_ABBREVIATIONS = new Set(Object.values(BRAZILIAN_STATES));

const plain = (value: string) =>
  value.normalize("NFD").replaceAll(/[̀-ͯ]/g, "").toLowerCase().trim();

/** "São Paulo", "sp" or "SP" to "SP", null when it is not a Brazilian state. */
export const stateAbbreviationOf = (value: string | null | undefined) => {
  if (!value) return null;
  const upper = value.trim().toUpperCase();
  if (STATE_ABBREVIATIONS.has(upper)) return upper;
  return BRAZILIAN_STATES[plain(value)] ?? null;
};

export interface AddressLocation {
  city: string;
  state: string;
}

/**
 * Reads the city and state at the end of an address, like the ones the
 * address field saves: "11060-001 Rua X, Gonzaga, Santos - São Paulo".
 */
export const locationFromAddress = (
  address: string | null | undefined,
): AddressLocation | null => {
  if (!address) return null;
  const lastPart = address.split(",").pop()?.trim() ?? "";
  const match = /^(.+?)\s*[-/]\s*([^-/]+)$/.exec(lastPart);
  if (!match) return null;
  const state = stateAbbreviationOf(match[2]);
  const city = match[1].trim();
  if (!state || !city || /\d/.test(city)) return null;
  return { city, state };
};
