import { Controller, Get, Param } from "@nestjs/common";
import { BrokerPageService } from "../services/broker-page.service";

/** Open to anyone: the page the broker shares on cards, QR codes and bios. */
@Controller("brokers")
export class BrokerPageController {
  constructor(private readonly brokerPageService: BrokerPageService) {}

  @Get(":slug")
  async findBySlug(@Param("slug") slug: string) {
    return this.brokerPageService.findBySlug(slug);
  }
}
