import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
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
  status_detail?: string | null;
  external_reference?: string | null;
  transaction_amount: number;
  currency_id?: string;
  date_approved?: string | null;
  date_of_expiration?: string | null;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
}

export type MercadoPagoPreapprovalStatus =
  | "pending"
  | "authorized"
  | "paused"
  | "cancelled";

/** A recurring card charge, Mercado Pago calls it preapproval. */
export interface MercadoPagoPreapproval {
  id: string;
  status: MercadoPagoPreapprovalStatus;
  external_reference?: string | null;
  next_payment_date?: string | null;
  auto_recurring?: {
    transaction_amount?: number;
    currency_id?: string;
    start_date?: string | null;
  };
}

/** One monthly charge of a preapproval. */
export interface MercadoPagoAuthorizedPayment {
  id: number;
  preapproval_id: string;
  status: string;
  transaction_amount: number;
  currency_id?: string;
  debit_date?: string | null;
  payment?: {
    id?: number;
    status?: MercadoPagoPaymentStatus;
    status_detail?: string | null;
  } | null;
}

export interface CardSubscriptionRequest {
  reference: string;
  reason: string;
  amountInBrl: number;
  payerEmail: string;
  cardToken: string;
  /** First charge date, empty to charge right away. */
  startDate: Date | null;
  backUrl: string;
}

export interface WebhookSignatureInput {
  signatureHeader: string | undefined;
  requestId: string | undefined;
  dataId: string | undefined;
}

export interface PixPaymentRequest {
  reference: string;
  amountInBrl: number;
  description: string;
  payerEmail: string;
  expiresAt: Date;
}

/** Pix charges and monthly card charges through the Mercado Pago API. */
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

  /** The secure card form in the browser needs the public key too. */
  get cardPaymentsEnabled() {
    return (
      this.isConfigured && Boolean(this.configuration.mercadoPagoPublicKey)
    );
  }

  get publicKey() {
    return this.configuration.mercadoPagoPublicKey || null;
  }

  async createPixPayment(request: PixPaymentRequest) {
    const notificationUrl = this.notificationUrl();

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
        payer: { email: request.payerEmail },
      },
    });
  }

  async findPayment(paymentId: string) {
    return this.request<MercadoPagoPayment>(
      `/v1/payments/${encodeURIComponent(paymentId)}`,
    );
  }

  /** Latest payments carrying the reference, newest first. */
  async searchPayments(externalReference: string) {
    const query = new URLSearchParams({
      external_reference: externalReference,
      sort: "date_created",
      criteria: "desc",
      limit: "20",
    });
    const result = await this.request<{ results?: MercadoPagoPayment[] }>(
      `/v1/payments/search?${query.toString()}`,
    );
    return result.results ?? [];
  }

  /**
   * Starts the monthly card charge. The card itself never reaches this
   * server: the browser turns it into a single use token on Mercado Pago.
   */
  async createCardSubscription(request: CardSubscriptionRequest) {
    // Preapproval notifications come from the Webhooks set in the Mercado
    // Pago panel, the API does not take a notification_url for them.
    return this.request<MercadoPagoPreapproval>("/preapproval", {
      method: "POST",
      idempotencyKey: randomUUID(),
      failureStatus: "bad_request",
      failureMessage:
        "O cartão não foi aceito. Confira os dados ou use outro cartão.",
      body: {
        reason: request.reason,
        external_reference: request.reference,
        payer_email: request.payerEmail,
        card_token_id: request.cardToken,
        back_url: request.backUrl,
        status: "authorized",
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: request.amountInBrl,
          currency_id: "BRL",
          ...(request.startDate
            ? { start_date: request.startDate.toISOString() }
            : {}),
        },
      },
    });
  }

  async findCardSubscription(preapprovalId: string) {
    return this.request<MercadoPagoPreapproval>(
      `/preapproval/${encodeURIComponent(preapprovalId)}`,
    );
  }

  async cancelCardSubscription(preapprovalId: string) {
    return this.request<MercadoPagoPreapproval>(
      `/preapproval/${encodeURIComponent(preapprovalId)}`,
      { method: "PUT", body: { status: "cancelled" } },
    );
  }

  /** New amount from the next monthly charge on. */
  async updateCardSubscriptionAmount(
    preapprovalId: string,
    amountInBrl: number,
    reason: string,
  ) {
    return this.request<MercadoPagoPreapproval>(
      `/preapproval/${encodeURIComponent(preapprovalId)}`,
      {
        method: "PUT",
        body: {
          reason,
          auto_recurring: {
            transaction_amount: amountInBrl,
            currency_id: "BRL",
          },
        },
      },
    );
  }

  async findAuthorizedPayment(authorizedPaymentId: string) {
    return this.request<MercadoPagoAuthorizedPayment>(
      `/authorized_payments/${encodeURIComponent(authorizedPaymentId)}`,
    );
  }

  get webhookSignatureEnabled() {
    return Boolean(this.configuration.mercadoPagoWebhookSecret);
  }

  /**
   * Checks the x-signature header Mercado Pago sends with each webhook:
   * HMAC SHA256 of "id:{data.id};request-id:{x-request-id};ts:{ts};" with the
   * secret of the integration. Without a secret configured, every webhook is
   * still read back from the API, so a forged one changes nothing.
   */
  isWebhookSignatureValid(input: WebhookSignatureInput) {
    const secret = this.configuration.mercadoPagoWebhookSecret;
    if (!secret) return true;
    if (!input.signatureHeader) return false;

    const parts = Object.fromEntries(
      input.signatureHeader.split(",").map((part) => {
        const [key, ...value] = part.split("=");
        return [key?.trim(), value.join("=").trim()];
      }),
    ) as Record<string, string | undefined>;
    const timestamp = parts.ts;
    const signature = parts.v1;
    if (!timestamp || !signature || !/^[0-9a-f]+$/i.test(signature)) {
      return false;
    }

    // No age limit on ts: Mercado Pago retries keep the first one, and a
    // replayed notification is harmless, every payment is read back and
    // settled only once.
    const dataId = input.dataId
      ? /^[a-z0-9]+$/i.test(input.dataId)
        ? input.dataId.toLowerCase()
        : input.dataId
      : undefined;
    const manifest = [
      dataId ? `id:${dataId};` : "",
      input.requestId ? `request-id:${input.requestId};` : "",
      `ts:${timestamp};`,
    ].join("");

    const expected = createHmac("sha256", secret).update(manifest).digest();
    const received = Buffer.from(signature, "hex");
    return (
      expected.length === received.length && timingSafeEqual(expected, received)
    );
  }

  private notificationUrl() {
    return this.configuration.notificationBaseUrl
      ? `${this.configuration.notificationBaseUrl}/webhooks/mercado-pago`
      : undefined;
  }

  private async request<T>(
    path: string,
    options: {
      method?: "GET" | "POST" | "PUT";
      body?: unknown;
      idempotencyKey?: string;
      /** bad_request answers the broker with failureMessage on 4xx. */
      failureStatus?: "bad_gateway" | "bad_request";
      failureMessage?: string;
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
      // Never logs the request body, it may carry the card token.
      this.logger.error(
        `Mercado Pago ${path.split("?")[0]} answered ${response.status}: ${text.substring(0, 500)}`,
      );
      if (
        options.failureStatus === "bad_request" &&
        response.status >= 400 &&
        response.status < 500
      ) {
        throw new BadRequestException(
          options.failureMessage ?? "O pagamento não foi aceito.",
        );
      }
      throw new BadGatewayException(
        options.failureMessage ?? "O pagamento não pôde ser criado.",
      );
    }

    return JSON.parse(text) as T;
  }
}
