import { Property } from "../../properties/entities/property.entity";
import {
  PropertyConciergeServiceEnum,
  PropertyFurnitureEnum,
  PropertyLiftEnum,
} from "../../properties/mappers/property.mapper";
import { HuntAmenity, ListingSnapshot } from "../types/hunt-criteria.type";
import { MatchFacts } from "./match-score.helper";

const numberOrNull = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const factsFromSnapshot = (snapshot: ListingSnapshot): MatchFacts => ({
  kind: snapshot.kind,
  transaction: snapshot.transaction,
  price: snapshot.price,
  maintenanceFee: snapshot.maintenanceFee,
  location: [
    snapshot.address,
    snapshot.neighborhood,
    snapshot.city,
    snapshot.state,
  ]
    .filter(Boolean)
    .join(", "),
  bedrooms: snapshot.bedrooms,
  suites: snapshot.suites,
  bathrooms: snapshot.bathrooms,
  parkingSpaces: snapshot.parkingSpaces,
  area: snapshot.area,
  beachDistanceMeters: snapshot.beachDistanceMeters,
  beachDistanceEstimated: snapshot.beachDistanceEstimated,
  amenities: snapshot.amenities,
});

/** The catalog keeps amenities as yes, no or unknown fields. */
const propertyAmenities = (property: Property): HuntAmenity[] | null => {
  const known: [boolean | null, HuntAmenity][] = [
    [property.infoHasGym, "gym"],
    [property.infoHasPool, "pool"],
    [property.infoHasBalcony, "balcony"],
    [property.infoHasFancyBalcony, "gourmet_balcony"],
    [property.infoHasAirConditioningSystem, "air_conditioning"],
    [
      property.infoLift === null
        ? null
        : property.infoLift !== PropertyLiftEnum.NONE,
      "elevator",
    ],
    [
      property.infoConciergeService === null
        ? null
        : property.infoConciergeService !== PropertyConciergeServiceEnum.NONE,
      "concierge",
    ],
    [
      property.infoFurniture === null
        ? null
        : property.infoFurniture === PropertyFurnitureEnum.FULL,
      "furnished",
    ],
  ];
  if (known.every(([value]) => value === null)) return null;
  return known
    .filter(([value]) => value === true)
    .map(([, amenity]) => amenity);
};

export const factsFromProperty = (property: Property): MatchFacts => {
  const beachKilometers = numberOrNull(property.infoBeachProximityInKm);
  return {
    kind: property.kind,
    transaction: null,
    price: numberOrNull(property.price),
    maintenanceFee: numberOrNull(property.infoMaintenanceFee),
    location: [property.alias, property.address, property.address2]
      .filter(Boolean)
      .join(", "),
    bedrooms: property.infoBedrooms,
    suites: property.infoSuiteBedrooms,
    bathrooms: property.infoBathrooms,
    parkingSpaces: property.infoParkingSpaceUnits,
    area: numberOrNull(property.infoSquareMeters),
    beachDistanceMeters:
      beachKilometers === null ? null : Math.round(beachKilometers * 1000),
    beachDistanceEstimated: false,
    amenities: propertyAmenities(property),
  };
};
