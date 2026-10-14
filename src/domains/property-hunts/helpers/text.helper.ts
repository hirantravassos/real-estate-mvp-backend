/** "Embaré, Santos" becomes "embare-santos", the way portals write places in links. */
export const slugify = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Lowercase without accents, to compare places written in different ways. */
export const plainText = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export const truncate = (value: string | null | undefined, length: number) =>
  (value ?? "").length > length
    ? `${(value ?? "").substring(0, length - 1)}…`
    : (value ?? "");

const CONTACT_PATTERNS = [
  /\b[\w.+-]+@[\w-]+(\.[\w-]+)+\b/g,
  /(https?:\/\/)?(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\/\S*/gi,
  /\bcreci\b[\s:.\-/nº°]*[a-z]{0,2}[\s\-/]*\d[\d.\-/ ]{2,}[a-z]?/gi,
  /(\+?55[\s.-]?)?\(?\b\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}\b/g,
];

/**
 * Takes emails, WhatsApp links, CRECI numbers and phones out of a listing
 * text, so the advertiser's contacts never reach the AI nor the database.
 */
export const withoutPersonalContacts = (value: string | null | undefined) =>
  CONTACT_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, "[contato no portal]"),
    value ?? "",
  );
