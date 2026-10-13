import { Controller, Get, Param } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { BrokerPageService } from "../services/broker-page.service";

/** Open to anyone: the page the broker shares on cards, QR codes and bios. */
/**
 * Read by the site's server to render public pages: every visitor arrives
 * from the same server address, so a per address limit would block them.
 */
@SkipThrottle()
@Controller("brokers")
export class BrokerPageController {
  constructor(private readonly brokerPageService: BrokerPageService) {}

  @Get(":slug")
  async findBySlug(@Param("slug") slug: string) {
    return this.brokerPageService.findBySlug(slug);
  }
}
