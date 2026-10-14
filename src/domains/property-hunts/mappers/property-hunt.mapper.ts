import dayjs from "dayjs";
import { LISTING_RETENTION_DAYS } from "../constants/portals.constant";
import { ListingShortcut } from "../entities/listing-shortcut.entity";
import { PropertyHunt } from "../entities/property-hunt.entity";
import { PropertyMatch } from "../entities/property-match.entity";
import { PropertyMatchOrigin } from "../enums/property-hunt.enum";

/** When a portal suggestion or shortcut is erased, null for the catalog. */
const expiresAtOf = (createdAt: Date) =>
  dayjs(createdAt).add(LISTING_RETENTION_DAYS, "day").toDate();

export class PropertyHuntMapper {
  static toHuntDto(hunt: PropertyHunt) {
    return {
      id: hunt.id,
      customerId: hunt.customerId,
      customer: hunt.customer
        ? { id: hunt.customer.id, name: hunt.customer.name }
        : null,
      conversationId: hunt.conversationId,
      origin: hunt.origin,
      request: hunt.request,
      headline: hunt.headline,
      summary: hunt.summary,
      criteria: hunt.criteria,
      portals: hunt.portals,
      includeCatalog: hunt.includeCatalog,
      status: hunt.status,
      progress: hunt.progress,
      catalogMatches: hunt.catalogMatches,
      portalMatches: hunt.portalMatches,
      creditsCharged: hunt.creditsCharged,
      errorMessage: hunt.errorMessage,
      startedAt: hunt.startedAt,
      finishedAt: hunt.finishedAt,
      createdAt: hunt.createdAt,
    };
  }

  static toMatchDto(match: PropertyMatch) {
    return {
      id: match.id,
      huntId: match.huntId,
      customerId: match.customerId,
      customer: match.customer
        ? { id: match.customer.id, name: match.customer.name }
        : null,
      propertyId: match.propertyId,
      origin: match.origin,
      portal: match.portal,
      externalUrl: match.externalUrl,
      title: match.title,
      listing: match.listing,
      coverImageUrl: match.coverImageUrl,
      price: match.price,
      score: match.score,
      highlights: match.highlights,
      warnings: match.warnings,
      status: match.status,
      note: match.note,
      expiresAt:
        match.origin === PropertyMatchOrigin.PORTAL
          ? expiresAtOf(match.createdAt)
          : null,
      createdAt: match.createdAt,
      updatedAt: match.updatedAt,
    };
  }

  static toShortcutDto(shortcut: ListingShortcut) {
    return {
      id: shortcut.id,
      matchId: shortcut.matchId,
      portal: shortcut.portal,
      externalUrl: shortcut.externalUrl,
      title: shortcut.title,
      kind: shortcut.kind,
      transaction: shortcut.transaction,
      price: shortcut.price,
      bedrooms: shortcut.bedrooms,
      area: shortcut.area,
      neighborhood: shortcut.neighborhood,
      city: shortcut.city,
      state: shortcut.state,
      summary: shortcut.summary,
      expiresAt: expiresAtOf(shortcut.createdAt),
      createdAt: shortcut.createdAt,
    };
  }
}
