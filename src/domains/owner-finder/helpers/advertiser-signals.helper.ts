export type AdvertiserType = "owner" | "agency" | "unknown";

/** A CRECI number is the surest sign of a broker or an agency. */
const CRECI_NUMBER = /\bcreci\b[^0-9\n]{0,20}\d{3,}/i;

const AGENCY_WORDS =
  /(corretor(a)? respons[aá]vel|fale com (o|a) corretor|imobili[aá]ria parceira|anunciante profissional|plant[aã]o de vendas|lan[cç]amento da construtora)/i;

const OWNER_WORDS =
  /(\bparticular\b|direto com o (dono|propriet[aá]rio)|direto com propriet[aá]rio|sem corretor|n[aã]o aceito corretor|sem intermedi[aá]rio|vendo meu|alugo meu|propriet[aá]rio anuncia|anunciante:?\s*propriet[aá]rio|pessoa f[ií]sica)/i;

export interface AdvertiserSignal {
  type: AdvertiserType;
  reason: string | null;
}

/**
 * Reads the listing page itself and tells who posted it. The page wins over
 * what the web search guessed: a CRECI on the page means a broker, even if
 * the ad says "particular".
 */
export const advertiserSignalOf = (
  text: string,
  ownerOnlySite: boolean,
): AdvertiserSignal => {
  if (CRECI_NUMBER.test(text)) {
    return { type: "agency", reason: "A página mostra um CRECI." };
  }
  if (AGENCY_WORDS.test(text)) {
    return {
      type: "agency",
      reason: "A página fala em corretor ou imobiliária.",
    };
  }
  const owner = text.match(OWNER_WORDS);
  if (owner) {
    return {
      type: "owner",
      reason: `A página diz "${owner[0].trim().toLowerCase()}".`,
    };
  }
  if (ownerOnlySite) {
    return { type: "owner", reason: "Site que só aceita anúncios de donos." };
  }
  return { type: "unknown", reason: null };
};

/** The first phone of the page that is a Brazilian number with area code. */
export const phoneFromContacts = (contacts: string[], acceptText: boolean) => {
  const ordered = [
    ...contacts.filter((contact) => /^(tel:|https?:)/i.test(contact)),
    ...(acceptText
      ? contacts.filter((contact) => !/^(tel:|mailto:|https?:)/i.test(contact))
      : []),
  ];
  for (const contact of ordered) {
    let digits = contact.replace(/\D/g, "");
    if (digits.length > 11 && digits.startsWith("55")) digits = digits.slice(2);
    if (digits.length === 10 || digits.length === 11) return digits;
  }
  return null;
};
