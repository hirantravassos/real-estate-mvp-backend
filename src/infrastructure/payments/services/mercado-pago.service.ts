import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { creditsConfig } from "../../../config/credits.config";

const REQUEST_TIMEOUT_MILLISECONDS = 30_000;

export type MercadoPagoPaymentStatus =
  | "pending"
  | "approved"
  | "authorized"
  | "in_process"
  | "in_mediation"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "charged_back";

export interface MercadoPagoPayment {
  id: number;
  status: MercadoPagoPaymentStatus;
  external_reference?: string | null;
  transaction_amount: number;
  date_of_expiration?: string | null;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
}

export interface PixPaymentRequest {
  reference: string;
  amountInBrl: number;
  description: string;
  payerEmail: string;
  expiresAt: Date;
}

/** Pix charges through the Mercado Pago payments API. */
@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);

  constructor(
    @Inject(creditsConfig.KEY)
    private readonly configuration: ConfigType<typeof creditsConfig>,
  ) {}

  get isConfigured() {
    return Boolean(this.configuration.mercadoPagoAccessToken);
  }

  async createPixPayment(request: PixPaymentRequest) {
    const notificationUrl = this.configuration.notificationBaseUrl
      ? `${this.configuration.notificationBaseUrl}/webhooks/mercado-pago`
      : undefined;

    return this.request<MercadoPagoPayment>("/v1/payments", {
      method: "POST",
      idempotencyKey: request.reference,
      body: {
        transaction_amount: request.amountInBrl,
        description: request.description,
        payment_method_id: "pix",
        external_reference: request.reference,
        notification_url: notificationUrl,
        date_of_expiration: request.expiresAt.toISOString(),
        payer: {
          email:
            this.configuration.mercadoPagoTestPayerEmail || request.payerEmail,
        },
      },
    });
  }

  async findPayment(paymentId: string) {
    return this.request<MercadoPagoPayment>(
      `/v1/payments/${encodeURIComponent(paymentId)}`,
    );
  }

  private async request<T>(
    path: string,
    options: {
      method?: "GET" | "POST";
      body?: unknown;
      idempotencyKey?: string;
    } = {},
  ): Promise<T> {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException("Pagamentos não configurados.");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.configuration.mercadoPagoAccessToken}`,
    };
    if (options.idempotencyKey) {
      headers["X-Idempotency-Key"] = options.idempotencyKey;
    }

    const response = await fetch(
      `${this.configuration.mercadoPagoApiUrl}${path}`,
      {
        method: options.method ?? "GET",
        headers,
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
      },
    ).catch((error: unknown) => {
      this.logger.error(`Mercado Pago unreachable: ${String(error)}`);
      throw new ServiceUnavailableException(
        "Não foi possível falar com o Mercado Pago.",
      );
    });

    const text = await response.text();

    if (!response.ok) {
      this.logger.error(
        `Mercado Pago ${path} answered ${response.status}: ${text.substring(0, 500)}`,
      );
      throw new BadGatewayException("O pagamento não pôde ser criado.");
    }

    return JSON.parse(text) as T;
  }
}
