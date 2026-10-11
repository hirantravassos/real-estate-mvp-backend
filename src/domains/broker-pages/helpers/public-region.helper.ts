const LEADING_NUMBER = /^\d+[a-z]?\s*(?:-\s*)?/i;

/**
 * The neighborhood and city of an address, without the street and number,
 * for public listings. "80000-000 Rua A, Centro, Curitiba - PR" and
 * "Rua A, 12 - Centro, Curitiba - PR" both become "Centro, Curitiba - PR".
 */
export const publicRegion = (address: string): string | null => {
  const [, ...rest] = address.split(",").map((part) => part.trim());
  const parts = rest
    .map((part, index) =>
      index === 0 ? part.replace(LEADING_NUMBER, "").trim() : part,
    )
    .filter(Boolean);
  return parts.length ? parts.join(", ") : null;
};
