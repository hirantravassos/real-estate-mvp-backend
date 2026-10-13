import { Controller, Get, Param } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { PropertyService } from "../services/property.service";
import { PropertyMediaService } from "../services/property-media.service";

/**
 * Read by the site's server to render public pages: every visitor arrives
 * from the same server address, so a per address limit would block them.
 */
@SkipThrottle()
@Controller("properties")
export class PropertyPresentationController {
  constructor(
    private readonly propertyService: PropertyService,
    private readonly propertyMediaService: PropertyMediaService,
  ) {}

  @Get(":id/presentation")
  async getPresentation(@Param("id") id: string) {
    const [property, media] = await Promise.all([
      this.propertyService.findOneForPresentation(id),
      this.propertyMediaService.findAllForPresentation(id),
    ]);
    return { ...property, media };
  }
}
