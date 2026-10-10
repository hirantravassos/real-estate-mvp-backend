export interface CreditPackage {
  key: string;
  name: string;
  credits: number;
  amountInBrl: number;
  highlight: boolean;
}

/**
 * What the broker can buy. The cheapest credit among these is the one used
 * to price the AI, so even the biggest discount keeps the minimum profit.
 */
export const CREDIT_PACKAGES: readonly CreditPackage[] = [
  {
    key: "starter",
    name: "Pacote inicial",
    credits: 500,
    amountInBrl: 9.9,
    highlight: false,
  },
  {
    key: "professional",
    name: "Pacote profissional",
    credits: 1500,
    amountInBrl: 24.9,
    highlight: true,
  },
  {
    key: "agency",
    name: "Pacote imobiliária",
    credits: 4000,
    amountInBrl: 59.9,
    highlight: false,
  },
];

export const findCreditPackage = (key: string) =>
  CREDIT_PACKAGES.find((creditPackage) => creditPackage.key === key) ?? null;
