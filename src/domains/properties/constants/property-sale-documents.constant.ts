/**
 * Paperwork a broker usually gathers to sell a property. The frontend shows
 * the titles and tips, here we only check that an upload names a known one.
 */
export const PROPERTY_SALE_DOCUMENT_CATEGORIES = [
  "registration",
  "property_tax_clearance",
  "condominium_clearance",
  "laudemium_clearance",
  "occupancy_permit",
  "owner_identity",
  "owner_civil_status",
  "owner_address_proof",
  "owner_clearances",
] as const;

export type PropertySaleDocumentCategory =
  (typeof PROPERTY_SALE_DOCUMENT_CATEGORIES)[number];

export const isPropertySaleDocumentCategory = (
  value: string,
): value is PropertySaleDocumentCategory =>
  (PROPERTY_SALE_DOCUMENT_CATEGORIES as readonly string[]).includes(value);
