import { PropertyKindEnum } from "../../properties/mappers/property.mapper";

export const HUNT_AMENITIES = [
  "gym",
  "pool",
  "balcony",
  "gourmet_balcony",
  "elevator",
  "concierge",
  "furnished",
  "air_conditioning",
  "barbecue",
  "playground",
  "party_room",
  "pets_allowed",
  "sea_view",
] as const;
export type HuntAmenity = (typeof HUNT_AMENITIES)[number];

export const HUNT_TRANSACTIONS = ["sale", "rent"] as const;
export type HuntTransaction = (typeof HUNT_TRANSACTIONS)[number];

/** What the broker is looking for, read by the AI from plain words. */
export interface HuntCriteria {
  transaction: HuntTransaction;
  kind: PropertyKindEnum | null;
  /** Two letters, as "SP". */
  state: string | null;
  city: string | null;
  neighborhoods: string[];
  minimumPrice: number | null;
  maximumPrice: number | null;
  minimumBedrooms: number | null;
  minimumSuites: number | null;
  minimumBathrooms: number | null;
  minimumParkingSpaces: number | null;
  minimumArea: number | null;
  maximumArea: number | null;
  maximumMaintenanceFee: number | null;
  maximumBeachDistanceMeters: number | null;
  amenities: HuntAmenity[];
  /** Wishes that do not fit a field, as "andar alto" or "aceita permuta". */
  extraWishes: string[];
}

/**
 * What is kept of one portal listing: the property's features, the
 * neighborhood and city, and a short description without contacts. No
 * street address, photos, videos nor anything about the advertiser.
 */
export interface ListingSnapshot {
  kind: PropertyKindEnum | null;
  transaction: HuntTransaction | null;
  price: number | null;
  maintenanceFee: number | null;
  propertyTax: number | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  bedrooms: number | null;
  suites: number | null;
  bathrooms: number | null;
  parkingSpaces: number | null;
  area: number | null;
  floor: number | null;
  beachDistanceMeters: number | null;
  /** True when the AI guessed the distance from the text. */
  beachDistanceEstimated: boolean;
  amenities: HuntAmenity[];
  description: string | null;
}
