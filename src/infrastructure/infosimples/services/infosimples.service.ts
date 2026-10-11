import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { infosimplesConfig } from "../../../config/infosimples.config";
import {
  InfosimplesConsultation,
  InfosimplesRawResponse,
  InfosimplesReceipt,
} from "../types/infosimples.type";

/** Extra time over what Infosimples spends on the portal, for the network. */
const NETWORK_MARGIN_MILLISECONDS = 30_000;
const RECEIPT_TIMEOUT_MILLISECONDS = 60_000;
const MAXIMUM_RECEIPT_BYTES = 20 * 1024 * 1024;

/**
 * Infosimples reads the public portals (Receita, TST and others) for us,
 * captcha included, and answers the certificate as data plus its PDF.
 */
@Injectable()
export class InfosimplesService {
  private readonly logger = new Logger(InfosimplesService.name);

  constructor(
    @Inject(infosimplesConfig.KEY)
    private readonly configuration: ConfigType<typeof infosimplesConfig>,
  ) {}

  get isConfigured() {
    return Boolean(this.configuration.token);
  }

  get estimatedCostInBrl() {
    return this.configuration.estimatedCostInBrl;
  }

  async consult(
    path: string,
    parameters: Record<string, string>,
  ): Promise<InfosimplesConsultation> {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException(
        "A busca automática de certidões não está configurada.",
      );
    }

    const body = new URLSearchParams({
      ...parameters,
      token: this.configuration.token,
      timeout: String(this.configuration.timeoutSeconds),
    });

    const response = await fetch(`${this.configuration.baseUrl}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(
        this.configuration.timeoutSeconds * 1000 + NETWORK_MARGIN_MILLISECONDS,
      ),
    }).catch((error: unknown) => {
      this.logger.error(`Infosimples unreachable on ${path}: ${String(error)}`);
      throw new ServiceUnavailableException(
        "Não foi possível falar com o serviço de certidões agora.",
      );
    });

    const text = await response.text();
    let raw: InfosimplesRawResponse;
    try {
      raw = JSON.parse(text) as InfosimplesRawResponse;
    } catch {
      this.logger.error(
        `Infosimples ${path} answered ${response.status}: ${text.substring(0, 500)}`,
      );
      throw new ServiceUnavailableException(
        "O serviço de certidões respondeu de um jeito inesperado.",
      );
    }

    const price = Number(raw.header?.price);
    const dataReceipts = (raw.data ?? [])
      .map((item) => item.site_receipt)
      .filter((value): value is string => typeof value === "string");

    return {
      code: raw.code,
      message:
        raw.code_message || raw.errors?.join(" ") || `Código ${raw.code}`,
      billable: raw.header?.billable === true,
      priceInBrl: Number.isFinite(price) ? price : null,
      data: raw.data ?? [],
      receiptUrls: [
        ...new Set([...(raw.site_receipts ?? []), ...dataReceipts]),
      ],
    };
  }

  /** Downloads one file the portal gave, null when it is gone or too big. */
  async downloadReceipt(url: string): Promise<InfosimplesReceipt | null> {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(RECEIPT_TIMEOUT_MILLISECONDS),
      });
      if (!response.ok) return null;
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length === 0 || buffer.length > MAXIMUM_RECEIPT_BYTES) {
        return null;
      }
      const mimeType = (response.headers.get("content-type") ?? "")
        .split(";")[0]
        .trim()
        .toLowerCase();
      return { buffer, mimeType: this.detectMimeType(buffer, mimeType) };
    } catch (error) {
      this.logger.warn(`Receipt download failed: ${String(error)}`);
      return null;
    }
  }

  /** Storage buckets often answer octet-stream, the PDF header tells the truth. */
  private detectMimeType(buffer: Buffer, declaredMimeType: string) {
    if (buffer.subarray(0, 5).toString("latin1") === "%PDF-") {
      return "application/pdf";
    }
    return declaredMimeType || "application/octet-stream";
  }
}
