import { SkipThrottle } from "@nestjs/throttler";
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from "@nestjs/common";
import type { EvolutionWebhookPayload } from "../../../infrastructure/evolution/types/evolution.type";
import { EvolutionWebhookService } from "../services/evolution-webhook.service";

/** Evolution posts here. The token in the path is the broker's secret. */
/** Provider servers post in bursts from few addresses, the token or the signature guards them. */
@SkipThrottle()
@Controller("webhooks/evolution")
export class EvolutionWebhookController {
  constructor(private readonly webhookService: EvolutionWebhookService) {}

  @Post(":token")
  @HttpCode(HttpStatus.OK)
  async receive(
    @Param("token") token: string,
    @Body() payload: EvolutionWebhookPayload,
  ) {
    const accepted = await this.webhookService.handle(token, payload);
    if (!accepted) throw new NotFoundException();
    return { received: true };
  }
}
