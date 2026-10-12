export enum SubscriptionPlanKey {
  BASIC = "basic",
  RECOMMENDED = "recommended",
  PREMIUM = "premium",
}

export enum SubscriptionPaymentMethod {
  CARD = "card",
  PIX = "pix",
}

export enum SubscriptionPaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  EXPIRED = "expired",
  FAILED = "failed",
}

/** Worked out from the dates every time, never stored. */
export enum SubscriptionAccessStatus {
  /** Free days of a new account, no monthly credits. */
  TRIALING = "trialing",
  /** Paid month running and set to renew. */
  ACTIVE = "active",
  /** Paid month running, cancelled by the broker, ends with the month. */
  CANCELED = "canceled",
  /** Payment missing or failed, still open for the grace days. */
  PAST_DUE = "past_due",
  /** No paid month and no grace left, only billing opens. */
  EXPIRED = "expired",
}

/** What each plan limits, counted on every creation. */
export enum PlanLimitResource {
  CUSTOMERS = "customers",
  PROPERTIES = "properties",
  OPEN_DEALS = "openDeals",
  PROPERTY_HUNTS_PER_MONTH = "propertyHuntsPerMonth",
}
