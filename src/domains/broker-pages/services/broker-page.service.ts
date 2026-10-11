import { Injectable } from "@nestjs/common";
import { UserService } from "../../users/services/user.service";
import { PropertyService } from "../../properties/services/property.service";
import { PropertyMediaService } from "../../properties/services/property-media.service";
import { publicRegion } from "../helpers/public-region.helper";
import {
  customerAddressOf,
  isFromPortal,
} from "../../properties/helpers/customer-safe.helper";

const MAXIMUM_LISTED_PROPERTIES = 60;

/**
 * The broker's public page: who they are, where they work and the
 * properties they chose to show. Owner contacts, notes, the clientele and
 * the AI memory never leave the app.
 */
@Injectable()
export class BrokerPageService {
  constructor(
    private readonly userService: UserService,
    private readonly propertyService: PropertyService,
    private readonly propertyMediaService: PropertyMediaService,
  ) {}

  async findBySlug(slug: string) {
    const broker = await this.userService.findBySlug(slug);
    const properties = await this.propertyService.findForLanding(
      broker.id,
      MAXIMUM_LISTED_PROPERTIES,
    );
    const covers = await this.propertyMediaService.findCoversForPresentation(
      properties.map((property) => property.id),
    );

    return {
      slug: broker.slug,
      name: broker.name,
      profileImage: broker.profileImage,
      avatar: broker.avatar ?? null,
      city: broker.city ?? null,
      phone: broker.phone ?? null,
      creci: broker.creci ?? null,
      bio: broker.bio ?? null,
      workingCities: broker.workingCities ?? [],
      salesNiches: broker.salesNiches ?? [],
      properties: properties.map((property) => ({
        id: property.id,
        kind: property.kind ?? null,
        alias: property.alias,
        // Portal finds keep the area the hunt read, never the listing's street.
        region: isFromPortal(property)
          ? customerAddressOf(property)
          : publicRegion(property.address),
        price: property.price,
        infoBedrooms: property.infoBedrooms,
        infoBathrooms: property.infoBathrooms,
        infoParkingSpaceUnits: property.infoParkingSpaceUnits,
        infoSquareMeters: property.infoSquareMeters,
        coverUrl: covers.get(property.id) ?? null,
      })),
    };
  }
}
