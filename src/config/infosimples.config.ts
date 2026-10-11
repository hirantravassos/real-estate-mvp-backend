import { registerAs } from "@nestjs/config";

export const infosimplesConfig = registerAs("infosimples", () => ({
  /** Fetching public certificates for the broker is off while it is empty. */
  token: process.env.INFOSIMPLES_TOKEN ?? "",
  baseUrl: (
    process.env.INFOSIMPLES_BASE_URL ||
    "https://api.infosimples.com/api/v2/consultas"
  ).replace(/\/+$/, ""),
  /** Seconds Infosimples keeps trying the public portal, from 15 to 600. */
  timeoutSeconds: Math.min(
    600,
    Math.max(
      15,
      parseInt(process.env.INFOSIMPLES_TIMEOUT_SECONDS || "120", 10),
    ),
  ),
  /**
   * What one query usually costs us in reais, shown to the broker before the
   * search. The real price Infosimples answers is the one charged.
   */
  estimatedCostInBrl: parseFloat(
    process.env.INFOSIMPLES_ESTIMATED_COST_IN_BRL || "0.5",
  ),
}));
