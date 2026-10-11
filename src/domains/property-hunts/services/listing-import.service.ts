import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import dayjs from "dayjs";
import sharp from "sharp";
import { Repository } from "typeorm";
import {
  ALLOWED_MEDIA_IMAGE_TYPES,
  StorageService,
} from "../../../infrastructure/storage/services/storage.service";
import { PropertyContact } from "../../properties/entities/property-contact.entity";
import {
  PropertyMedia,
  PropertyMediaType,
} from "../../properties/entities/property-media.entity";
import { Property } from "../../properties/entities/property.entity";
import {
  PropertyConciergeServiceEnum,
  PropertyFurnitureEnum,
  PropertyLiftEnum,
} from "../../properties/mappers/property.mapper";
import { User } from "../../users/entities/user.entity";
import { PORTALS } from "../constants/portals.constant";
import { PropertyMatch } from "../entities/property-match.entity";
import { AMENITY_LABELS } from "../helpers/match-score.helper";
import { truncate } from "../helpers/text.helper";
import { ListingSnapshot } from "../types/hunt-criteria.type";

const MAXIMUM_PHOTOS = 25;
const MAXIMUM_PHOTO_BYTES = 15 * 1024 * 1024;
const MAXIMUM_VIDEO_BYTES = 200 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MILLISECONDS = 25_000;
const PARALLEL_DOWNLOADS = 4;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

const ADVERTISER_KIND_LABELS = {
  owner: "proprietário",
  broker: "corretor",
  agency: "imobiliária",
  unknown: "anunciante",
} as const;

/**
 * Turns a portal listing into a property of the broker's catalog, with the
 * photos and videos copied to our storage, so it stays even after the
 * listing leaves the portal.
 */
@Injectable()
export class ListingImportService {
  private readonly logger = new Logger(ListingImportService.name);

  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(PropertyMedia)
    private readonly mediaRepository: Repository<PropertyMedia>,
    private readonly storageService: StorageService,
  ) {}

  async importMatch(user: User, match: PropertyMatch) {
    const listing = match.listing as ListingSnapshot;
    const property = await this.propertyRepository.save(
      this.toProperty(user, match, listing),
    );

    const media = await this.copyMedia(user.id, property.id, match, listing);
    return { property, mediaCount: media };
  }

  private toProperty(
    user: User,
    match: PropertyMatch,
    listing: ListingSnapshot,
  ) {
    const property = new Property();
    property.user = user;
    property.kind = listing.kind;
    property.alias = truncate(match.title, 255);
    property.address =
      [listing.address, listing.neighborhood, listing.city, listing.state]
        .filter(Boolean)
        .join(", ") || match.title;
    property.address2 = "";
    property.price = (listing.price ?? 0).toFixed(2);
    property.comment = this.describe(match, listing);
    property.sourcePortal = match.portal;
    property.sourceUrl = match.externalUrl;

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

  /** The private notes: where it came from, the full text and the advertiser. */
  private describe(match: PropertyMatch, listing: ListingSnapshot) {
    const portal = match.portal ? PORTALS[match.portal].label : "portal";
    const advertiser = listing.advertiser;
    const advertiserLines = [
      advertiser.name
        ? `${advertiser.name} (${ADVERTISER_KIND_LABELS[advertiser.kind]})`
        : `Anunciante: ${ADVERTISER_KIND_LABELS[advertiser.kind]}`,
      advertiser.company ? `Empresa: ${advertiser.company}` : null,
      advertiser.creci ? `CRECI: ${advertiser.creci}` : null,
      advertiser.phones.length
        ? `Telefones: ${advertiser.phones.join(", ")}`
        : null,
      advertiser.emails.length
        ? `E-mails: ${advertiser.emails.join(", ")}`
        : null,
    ].filter(Boolean);
    const videos = listing.videos.filter(
      (video) => !/\.mp4(\?|$)/i.test(video),
    );

    return [
      `🔎 Garimpado no ${portal} pela caça com IA em ${dayjs().format("DD/MM/YYYY")}.`,
      match.externalUrl ? `Anúncio: ${match.externalUrl}` : null,
      listing.amenities.length
        ? `Diferenciais: ${listing.amenities.map((amenity) => AMENITY_LABELS[amenity]).join(", ")}`
        : null,
      listing.beachDistanceMeters !== null && listing.beachDistanceEstimated
        ? "Distância da praia estimada pela IA, confirme na visita."
        : null,
      listing.description
        ? `\nDescrição do anúncio:\n${listing.description}`
        : null,
      `\n📇 Contato do anúncio:\n${advertiserLines.join("\n")}`,
      videos.length ? `\n🎬 Vídeos e tours:\n${videos.join("\n")}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  }

  private async copyMedia(
    userId: string,
    propertyId: string,
    match: PropertyMatch,
    listing: ListingSnapshot,
  ) {
    const referer = match.portal ? PORTALS[match.portal].homeUrl : undefined;
    const sources = [
      ...listing.photos.slice(0, MAXIMUM_PHOTOS).map((url) => ({
        url,
        type: PropertyMediaType.IMAGE,
      })),
      ...listing.videos
        .filter((video) => /\.(mp4|webm|mov)(\?|$)/i.test(video))
        .slice(0, 3)
        .map((url) => ({ url, type: PropertyMediaType.VIDEO })),
    ];

    const saved: PropertyMedia[] = [];
    for (let start = 0; start < sources.length; start += PARALLEL_DOWNLOADS) {
      const chunk = sources.slice(start, start + PARALLEL_DOWNLOADS);
      const results = await Promise.all(
        chunk.map((source, offset) =>
          this.copyOne(userId, propertyId, source, start + offset, referer),
        ),
      );
      saved.push(...results.filter((media): media is PropertyMedia => !!media));
    }

    const cover = saved.find((media) => media.type === PropertyMediaType.IMAGE);
    if (cover) {
      cover.isCover = true;
      await this.mediaRepository.save(cover);
    }
    return saved.length;
  }

  private async copyOne(
    userId: string,
    propertyId: string,
    source: { url: string; type: PropertyMediaType },
    order: number,
    referer?: string,
  ) {
    try {
      const response = await fetch(source.url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: source.type === PropertyMediaType.IMAGE ? "image/*" : "*/*",
          ...(referer ? { Referer: referer } : {}),
        },
        signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MILLISECONDS),
      });
      if (!response.ok) return null;

      const limit =
        source.type === PropertyMediaType.IMAGE
          ? MAXIMUM_PHOTO_BYTES
          : MAXIMUM_VIDEO_BYTES;
      const declaredSize = Number(response.headers.get("content-length") ?? 0);
      if (declaredSize > limit) return null;

      let buffer: Buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > limit || buffer.length < 2000) return null;
      let mimeType = (response.headers.get("content-type") ?? "")
        .split(";")[0]
        .trim()
        .toLowerCase();

      if (source.type === PropertyMediaType.IMAGE) {
        if (!ALLOWED_MEDIA_IMAGE_TYPES.has(mimeType)) {
          buffer = await sharp(buffer).jpeg({ quality: 85 }).toBuffer();
          mimeType = "image/jpeg";
        }
        const { width } = await sharp(buffer).metadata();
        if (!width || width < 300) return null;
      } else if (!mimeType.startsWith("video/")) {
        return null;
      }

      const extension = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
      const s3Key = this.storageService.generateMediaS3Key(
        userId,
        propertyId,
        `garimpo-${order + 1}.${extension}`,
      );
      await this.storageService.uploadBuffer(s3Key, buffer, mimeType);

      return await this.mediaRepository.save(
        this.mediaRepository.create({
          userId,
          propertyId,
          type: source.type,
          displayName:
            source.type === PropertyMediaType.IMAGE
              ? `Foto ${order + 1} do anúncio`
              : "Vídeo do anúncio",
          s3Key,
          mimeType,
          sizeBytes: buffer.length,
          sortOrder: order,
          isCover: false,
        }),
      );
    } catch (error) {
      this.logger.debug(`Could not copy ${source.url}: ${String(error)}`);
      return null;
    }
  }
}
