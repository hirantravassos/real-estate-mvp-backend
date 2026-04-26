import { Controller, Get, Param } from "@nestjs/common";
import { PropertyService } from "../services/property.service";
import { PropertyMediaService } from "../services/property-media.service";

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
