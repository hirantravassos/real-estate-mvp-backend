import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import dayjs from "dayjs";
import { IsNull, Not, Repository } from "typeorm";
import { PropertyContact } from "../../properties/entities/property-contact.entity";
import { PropertyMedia } from "../../properties/entities/property-media.entity";
import { Property } from "../../properties/entities/property.entity";
import {
  PropertySourceDetails,
  scrubThirdPartyData,
} from "../../properties/helpers/customer-safe.helper";
import {
  PropertyConciergeServiceEnum,
  PropertyFurnitureEnum,
  PropertyLiftEnum,
} from "../../properties/mappers/property.mapper";
import { User } from "../../users/entities/user.entity";
import { PropertyMatch } from "../entities/property-match.entity";
import { AMENITY_LABELS } from "../helpers/match-score.helper";
import { truncate } from "../helpers/text.helper";
import { ListingSnapshot } from "../types/hunt-criteria.type";

/** Links to the listing's own photos, shown to the broker from the portal. */
const MAXIMUM_PHOTO_LINKS = 25;

const ADVERTISER_KIND_LABELS = {
  owner: "proprietário",
  broker: "corretor",
  agency: "imobiliária",
  unknown: "anunciante",
} as const;

/**
 * Keeps a portal listing in the broker's catalog as a private property. The
 * photos are third party works (Lei 9.610/1998, art. 7, VII and art. 29,
 * IX): they are never copied to our storage nor stamped, only their links
 * are kept, shown to the broker from the portal. The property never reaches
 * the public page nor the shared link, see `isFromPortal`.
 */
@Injectable()
export class ListingImportService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ListingImportService.name);

  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(PropertyMedia)
    private readonly mediaRepository: Repository<PropertyMedia>,
    @InjectRepository(PropertyMatch)
    private readonly matchRepository: Repository<PropertyMatch>,
  ) {}

  async importMatch(user: User, match: PropertyMatch) {
    const listing = match.listing as ListingSnapshot;
    const property = await this.propertyRepository.save(
      this.toProperty(user, match, listing),
    );
    return { property, mediaCount: 0 };
  }

  private toProperty(
    user: User,
    match: PropertyMatch,
    listing: ListingSnapshot,
  ) {
    const property = new Property();
    property.user = user;
    property.kind = listing.kind;
    property.alias = truncate(this.cleanTitle(match, listing), 255);
    property.address =
      [listing.address, listing.neighborhood, listing.city, listing.state]
        .filter(Boolean)
        .join(", ") || match.title;
    property.address2 = "";
    property.price = (listing.price ?? 0).toFixed(2);
    property.comment = this.describe(match, listing);
    property.sourcePortal = match.portal;
    property.sourceUrl = match.externalUrl;
    property.sourceDetails = this.sourceDetailsOf(listing);
    property.showOnLanding = false;

    property.infoBedrooms = listing.bedrooms;
    property.infoSuiteBedrooms = listing.suites;
    property.infoBathrooms = listing.bathrooms;
    property.infoParkingSpaceUnits = listing.parkingSpaces;
    property.infoSquareMeters = listing.area;
    property.infoFloor = listing.floor;
    property.infoMaintenanceFee =
      listing.maintenanceFee === null
        ? null
        : listing.maintenanceFee.toFixed(2);
    property.infoPropertyTax =
      listing.propertyTax === null ? null : listing.propertyTax.toFixed(2);
    property.infoBeachProximityInKm =
      listing.beachDistanceMeters === null
        ? null
        : Math.round(listing.beachDistanceMeters / 10) / 100;

    const has = (amenity: ListingSnapshot["amenities"][number]) =>
      listing.amenities.includes(amenity) ? true : null;
    property.infoHasGym = has("gym");
    property.infoHasPool = has("pool");
    property.infoHasBalcony =
      has("balcony") ?? (listing.amenities.includes("gourmet_balcony") || null);
    property.infoHasFancyBalcony = has("gourmet_balcony");
    property.infoHasAirConditioningSystem = has("air_conditioning");
    property.infoLift = listing.amenities.includes("elevator")
      ? PropertyLiftEnum.COMMON
      : null;
    property.infoConciergeService = listing.amenities.includes("concierge")
      ? PropertyConciergeServiceEnum.FULL
      : null;
    property.infoFurniture = listing.amenities.includes("furnished")
      ? PropertyFurnitureEnum.FULL
      : null;

    property.contacts = listing.advertiser.phones.map((phone) => {
      const contact = new PropertyContact();
      contact.user = user;
      contact.phone = phone;
      contact.name = truncate(
        [
          listing.advertiser.name,
          `(${ADVERTISER_KIND_LABELS[listing.advertiser.kind]})`,
        ]
          .filter(Boolean)
          .join(" "),
        255,
      );
      return contact;
    });
    return property;
  }

  /**
   * The notes keep only what describes the property itself. Everything that
   * leads to the original listing (link, advertiser, phones, codes) goes to
   * the source details, seen only by the broker.
   */
  private describe(match: PropertyMatch, listing: ListingSnapshot) {
    const description = scrubThirdPartyData(listing.description, [
      listing.advertiser.name,
      listing.advertiser.company,
    ]);
    return [
      "🔒 Garimpado pela caça com IA. Imóvel privado: não vai para a sua página nem para link público. Fotos, link, anunciante e contatos ficam no painel Origem do anúncio, só para você.",
      listing.amenities.length
        ? `Diferenciais: ${listing.amenities.map((amenity) => AMENITY_LABELS[amenity]).join(", ")}`
        : null,
      listing.beachDistanceMeters !== null && listing.beachDistanceEstimated
        ? "Distância da praia estimada pela IA, confirme na visita."
        : null,
      description ? `\nSobre o imóvel:\n${description}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  }

  private sourceDetailsOf(listing: ListingSnapshot): PropertySourceDetails {
    return {
      importedAt: dayjs().toISOString(),
      neighborhood: listing.neighborhood,
      city: listing.city,
      state: listing.state,
      advertiser: listing.advertiser,
      description: listing.description,
      photos: listing.photos.slice(0, MAXIMUM_PHOTO_LINKS),
      videos: listing.videos,
    };
  }

  /**
   * Properties imported before the source details existed had the listing
   * link and the advertiser in their notes. Moves them out, once.
   */
  async onApplicationBootstrap() {
    const properties = await this.propertyRepository
      .find({
        where: { sourcePortal: Not(IsNull()), sourceDetails: IsNull() },
        take: 500,
      })
      .catch(() => [] as Property[]);
    for (const property of properties) {
      const match = await this.matchRepository.findOne({
        where: { propertyId: property.id, userId: property.userId },
        order: { createdAt: "ASC" },
      });
      if (!match?.listing) continue;
      await this.propertyRepository.update(
        { id: property.id },
        {
          alias: truncate(this.cleanTitle(match, match.listing), 255),
          comment: this.describe(match, match.listing),
          sourceDetails: this.sourceDetailsOf(match.listing),
        },
      );
      await this.mediaRepository
        .createQueryBuilder()
        .update()
        .set({ displayName: () => "REPLACE(displayName, ' do anúncio', '')" })
        .where("propertyId = :propertyId", { propertyId: property.id })
        .execute();
    }
    if (properties.length) {
      this.logger.log(`Cleaned the notes of ${properties.length} properties`);
    }
  }

  private cleanTitle(match: PropertyMatch, listing: ListingSnapshot) {
    return (
      scrubThirdPartyData(match.title, [
        listing.advertiser.name,
        listing.advertiser.company,
      ]) || "Imóvel garimpado"
    );
  }
}
