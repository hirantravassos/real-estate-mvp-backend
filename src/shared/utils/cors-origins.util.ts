/** Production sites that may always call the API from the browser. */
const PRODUCTION_ORIGINS = [
  "https://brokerin.com.br",
  "https://www.brokerin.com.br",
];

const DEVELOPMENT_ORIGIN = "http://localhost:3000";

const normalizeOrigin = (origin: string): string =>
  origin.trim().replace(/\/+$/, "");

/** Origins listed in APP_CORS_ORIGIN, comma separated, in the given order. */
export const readConfiguredCorsOrigins = (): string[] =>
  (process.env.APP_CORS_ORIGIN ?? "")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);

/**
 * Strict allowlist for the API and the realtime socket: the production sites
 * plus whatever APP_CORS_ORIGIN lists. Exact matches only, the request origin
 * is never reflected.
 */
export const resolveCorsOrigins = (): string[] => {
  const configuredOrigins = readConfiguredCorsOrigins();
  return [
    ...new Set([
      ...PRODUCTION_ORIGINS,
      ...(configuredOrigins.length > 0
        ? configuredOrigins
        : [DEVELOPMENT_ORIGIN]),
    ]),
  ];
};
