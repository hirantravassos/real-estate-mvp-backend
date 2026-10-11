import dayjs from "dayjs";

export type CustomerWarmth = "new" | "hot" | "warm" | "cooling" | "cold";

export const WARMTH_LABEL: Record<CustomerWarmth, string> = {
  new: "Novo",
  hot: "Quente",
  warm: "Morno",
  cooling: "Esfriando",
  cold: "Frio",
};

export interface CustomerWarmthInput {
  createdAt: Date;
  notes: { createdAt: Date }[];
  visits: { startsAt: Date; endsAt: Date }[];
}

export interface CustomerWarmthResult {
  warmth: CustomerWarmth;
  lastActivityAt: Date | null;
  daysSinceActivity: number | null;
  nextVisit: { startsAt: Date; endsAt: Date } | null;
}

/**
 * Same rule the app uses to color the customer's diamond: the last note,
 * past visit or the sign up date, and any visit still ahead.
 */
export const customerWarmthOf = (
  customer: CustomerWarmthInput,
  now = dayjs(),
): CustomerWarmthResult => {
  const pastVisitDates = customer.visits
    .filter((visit) => dayjs(visit.startsAt).isBefore(now))
    .map((visit) => visit.startsAt);

  const lastActivityAt =
    [
      customer.createdAt,
      ...customer.notes.map((note) => note.createdAt),
      ...pastVisitDates,
    ]
      .filter(Boolean)
      .sort((first, second) => second.getTime() - first.getTime())[0] ?? null;

  const nextVisit =
    customer.visits
      .filter((visit) => dayjs(visit.endsAt).isAfter(now))
      .sort(
        (first, second) => first.startsAt.getTime() - second.startsAt.getTime(),
      )[0] ?? null;

  const daysSinceActivity = lastActivityAt
    ? now.startOf("day").diff(dayjs(lastActivityAt).startOf("day"), "day")
    : null;

  const createdRecently = now.diff(dayjs(customer.createdAt), "day") < 2;

  let warmth: CustomerWarmth = "warm";
  if (nextVisit) warmth = "hot";
  else if (createdRecently && customer.notes.length <= 1) warmth = "new";
  else if (daysSinceActivity === null) warmth = "cold";
  else if (daysSinceActivity <= 2) warmth = "hot";
  else if (daysSinceActivity <= 7) warmth = "warm";
  else if (daysSinceActivity <= 21) warmth = "cooling";
  else warmth = "cold";

  return { warmth, lastActivityAt, daysSinceActivity, nextVisit };
};
