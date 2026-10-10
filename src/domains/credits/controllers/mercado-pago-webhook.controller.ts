import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
} from "@nestjs/common";
import { CreditPurchaseService } from "../services/credit-purchase.service";

interface MercadoPagoNotification {
  type?: string;
  action?: string;
  data?: { id?: string | number };
}

/**
 * Mercado Pago only tells which payment changed. The payment itself is read
 * back from their API, so a forged call cannot add credits.
 */
@Controller("webhooks/mercado-pago")
export class MercadoPagoWebhookController {
  private readonly logger = new Logger(MercadoPagoWebhookController.name);

  constructor(private readonly purchaseService: CreditPurchaseService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async receive(
    @Body() body: MercadoPagoNotification,
    @Query("data.id") queryDataId?: string,
    @Query("type") queryType?: string,
  ) {
    const type = body?.type ?? queryType;
    const paymentId = body?.data?.id ?? queryDataId;

    if (type !== "payment" || !paymentId) return { received: true };

    await this.purchaseService
      .handleNotification(String(paymentId))
      .catch((error: unknown) => {
        this.logger.error(
          `Payment ${paymentId} notification failed: ${String(error)}`,
        );
      });

    return { received: true };
  }
}
