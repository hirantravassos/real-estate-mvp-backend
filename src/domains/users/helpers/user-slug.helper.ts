export const SLUG_MAX_LENGTH = 60;

/** Lowercase letters, digits and single dashes, never at the edges. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Words a broker cannot take, so the address never looks like the app's. */
const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "brokerin",
  "configuracoes",
  "corretor",
  "login",
  "settings",
  "signup",
  "suporte",
]);

/** "Maria Souza Imóveis" becomes "maria-souza-imoveis". */
export const slugify = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");

export const isReservedSlug = (slug: string): boolean =>
  RESERVED_SLUGS.has(slug);
