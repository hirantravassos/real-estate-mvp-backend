import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  UnauthorizedException,
} from "@nestjs/common";
import { MercadoPagoService } from "../../../infrastructure/payments/services/mercado-pago.service";
import { SubscriptionBillingService } from "../services/subscription-billing.service";

interface MercadoPagoNotification {
  type?: string;
  topic?: string;
  action?: string;
  data?: { id?: string | number };
}

const PAYMENT_TOPICS = new Set(["payment"]);
const PREAPPROVAL_TOPICS = new Set(["subscription_preapproval", "preapproval"]);
const AUTHORIZED_PAYMENT_TOPICS = new Set([
  "subscription_authorized_payment",
  "authorized_payment",
]);
const NOTIFICATION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Mercado Pago only tells what changed. Every payment and card charge is
 * read back from their API, so a forged call cannot add credits nor open
 * the app. With MERCADO_PAGO_WEBHOOK_SECRET set, the signature is checked too.
 */
@Controller("webhooks/mercado-pago")
export class MercadoPagoWebhookController {
  private readonly logger = new Logger(MercadoPagoWebhookController.name);

  constructor(
    private readonly billingService: SubscriptionBillingService,
    private readonly mercadoPagoService: MercadoPagoService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async receive(
    @Body() body: MercadoPagoNotification,
    @Headers("x-signature") signatureHeader?: string,
    @Headers("x-request-id") requestId?: string,
    @Query("data.id") queryDataId?: string,
    @Query("id") queryId?: string,
    @Query("type") queryType?: string,
    @Query("topic") queryTopic?: string,
  ) {
    const topic = body?.type ?? body?.topic ?? queryType ?? queryTopic;
    const notificationId = String(
      body?.data?.id ?? queryDataId ?? queryId ?? "",
    );

    if (!topic || !NOTIFICATION_ID_PATTERN.test(notificationId)) {
      return { received: true };
    }

    if (
      !this.mercadoPagoService.isWebhookSignatureValid({
        signatureHeader,
        requestId,
        dataId: queryDataId ?? notificationId,
      })
    ) {
      this.logger.warn(`Mercado Pago ${topic} webhook with a bad signature`);
      throw new UnauthorizedException("Assinatura inválida.");
    }

    const handler = PAYMENT_TOPICS.has(topic)
      ? () => this.billingService.handlePaymentNotification(notificationId)
      : PREAPPROVAL_TOPICS.has(topic)
        ? () =>
            this.billingService.handlePreapprovalNotification(notificationId)
        : AUTHORIZED_PAYMENT_TOPICS.has(topic)
          ? () =>
              this.billingService.handleAuthorizedPaymentNotification(
                notificationId,
              )
          : null;

    if (!handler) return { received: true };

    await handler().catch((error: unknown) => {
      this.logger.error(
        `Mercado Pago ${topic} ${notificationId} failed: ${String(error)}`,
      );
    });

    return { received: true };
  }
}
