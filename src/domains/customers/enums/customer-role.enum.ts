/**
 * What a contact is to the broker. One person can hold more than one role,
 * an owner selling a flat may also be buying another one.
 */
export enum CustomerRole {
  /** Looking to buy, the only role that walks through the funnel. */
  BUYER = "buyer",
  /** Selling a property the broker has on the catalog. */
  OWNER = "owner",
  /** Partner broker working a deal together or helping with something. */
  PARTNER = "partner",
}

export const CUSTOMER_ROLE_COLUMNS = {
  [CustomerRole.BUYER]: "isBuyer",
  [CustomerRole.OWNER]: "isOwner",
  [CustomerRole.PARTNER]: "isPartner",
} as const;
