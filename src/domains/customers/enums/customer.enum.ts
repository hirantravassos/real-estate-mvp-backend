/**
 * What a contact is to the broker. One contact may hold several roles at once,
 * like a seller who is also buying the next home.
 */
export enum CustomerRole {
  /** Looking for a property to buy. */
  BUYER = "buyer",
  /** Owns a property the broker is selling. */
  SELLER = "seller",
  /** Another broker who shares deals and commissions. */
  PARTNER = "partner",
}

export const CUSTOMER_ROLE_LABELS: Record<CustomerRole, string> = {
  [CustomerRole.BUYER]: "Comprador",
  [CustomerRole.SELLER]: "Vendedor",
  [CustomerRole.PARTNER]: "Parceiro",
};

/** Role of a contact saved without one, as every contact was before roles. */
export const DEFAULT_CUSTOMER_ROLES: CustomerRole[] = [CustomerRole.BUYER];
