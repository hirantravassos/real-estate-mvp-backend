import { publicRegion } from "../../broker-pages/helpers/public-region.helper";

/** What the hunt kept from the original listing, for the broker only. */
export interface PropertySourceDetails {
  importedAt: string;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  advertiser: {
    name: string | null;
    kind: "owner" | "broker" | "agency" | "unknown";
    phones: string[];
    emails: string[];
    creci: string | null;
    company: string | null;
  };
  /** The advertiser's own text, as written on the portal. */
  description: string | null;
  videos: string[];
}

interface LocatedProperty {
  address: string;
  address2: string;
  sourcePortal?: string | null;
  sourceDetails?: PropertySourceDetails | null;
}

/** Properties a hunt brought from a portal keep their origin to the broker. */
export const isFromPortal = (property: { sourcePortal?: string | null }) =>
  Boolean(property.sourcePortal);

/**
 * The address a customer may see. A property found on a portal only shows
 * its neighborhood and city: the street, the number and the listing would
 * let the customer reach the advertiser and close the deal without the
 * broker.
 */
export const customerAddressOf = (property: LocatedProperty) => {
  if (!isFromPortal(property)) {
    return [property.address, property.address2].filter(Boolean).join(", ");
  }
  const details = property.sourceDetails;
  const area = [details?.neighborhood, details?.city, details?.state]
    .filter(Boolean)
    .join(", ");
  return area || "Localização com o corretor";
};

const PUBLIC_ADDRESS_FALLBACK = "Localização com o corretor";

/**
 * The address anyone with the public link may see: only the neighborhood
 * and city. Street, number and unit point to the owner's home, so they stay
 * between the broker and the customer.
 */
export const publicAddressOf = (property: LocatedProperty) => {
  if (isFromPortal(property)) return customerAddressOf(property);
  return publicRegion(property.address) ?? PUBLIC_ADDRESS_FALLBACK;
};

const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/gi;
const DOMAIN_PATTERN =
  /\b[\w-]+\.(?:com|net|org|imb|imob)(?:\.br)?\b(?:\/\S*)?/gi;
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const PHONE_PATTERN =
  /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\s?)?\d{4}[\s.-]?\d{4}\b/g;
const CRECI_PATTERN = /\bcreci\b[^\n]{0,30}?\d[\dA-Za-z./-]*/gi;
const REFERENCE_PATTERN =
  /\b(?:c[oó]d(?:igo)?|ref(?:er[eê]ncia)?|id)\.?\s*(?:do\s+(?:im[oó]vel|an[uú]ncio))?\s*[:#-]?\s*[A-Z0-9-]{3,}\b/gi;

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Removes from a text whatever leads to the original listing: links,
 * emails, phones, CRECI, listing codes and the advertiser's names.
 */
export const scrubThirdPartyData = (
  text: string | null | undefined,
  names: (string | null | undefined)[] = [],
) => {
  if (!text) return "";
  let clean = text
    .replace(URL_PATTERN, "")
    .replace(EMAIL_PATTERN, "")
    .replace(DOMAIN_PATTERN, "")
    .replace(CRECI_PATTERN, "")
    .replace(REFERENCE_PATTERN, "")
    .replace(PHONE_PATTERN, "");
  for (const name of names) {
    const trimmed = name?.trim();
    if (!trimmed || trimmed.length < 3) continue;
    clean = clean.replace(new RegExp(escapeRegex(trimmed), "gi"), "");
  }
  return clean
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([,.;:!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};
