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

/** Digits of a Brazilian phone without the country code, or null if it is not one. */
export const brazilianPhoneDigits = (value: string | null | undefined) => {
  let digits = (value ?? "").replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  return digits.length === 10 || digits.length === 11 ? digits : null;
};
