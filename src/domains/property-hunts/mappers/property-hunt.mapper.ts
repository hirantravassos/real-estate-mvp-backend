import { PORTALS } from "../constants/portals.constant";
import { PortalAccount } from "../entities/portal-account.entity";
import { PropertyHunt } from "../entities/property-hunt.entity";
import { PropertyMatch } from "../entities/property-match.entity";
import { PortalKey } from "../enums/property-hunt.enum";

export class PropertyHuntMapper {
  static toPortalDto(
    portal: PortalKey,
    account: PortalAccount | null,
    platformAccountReady: boolean,
  ) {
    const definition = PORTALS[portal];
    return {
      portal,
      label: definition.label,
      homeUrl: definition.homeUrl,
      loginHint: definition.loginHint,
      passwordless: definition.passwordless,
      platformAccountReady,
      account: account
        ? {
            id: account.id,
            login: account.login,
            status: account.status,
            statusMessage: account.statusMessage,
            connectedAt: account.connectedAt,
            lastUsedAt: account.lastUsedAt,
          }
        : null,
    };
  }

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
      createdAt: match.createdAt,
      updatedAt: match.updatedAt,
    };
  }
}
