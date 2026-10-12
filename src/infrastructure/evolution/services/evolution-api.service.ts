import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { evolutionConfig } from "../../../config/evolution.config";
import {
  EvolutionChat,
  EvolutionConnectionState,
  EvolutionContact,
  EvolutionInstanceInformation,
  EvolutionMediaDownload,
  EvolutionMessage,
  EvolutionMessageKey,
  EvolutionMessagePage,
  EvolutionQrCode,
  EvolutionSendMediaType,
} from "../types/evolution.type";
import {
  EvolutionThrottleService,
  SendContext,
} from "./evolution-throttle.service";

/** The events this app listens to. */
export const EVOLUTION_WEBHOOK_EVENTS = [
  "QRCODE_UPDATED",
  "CONNECTION_UPDATE",
  "MESSAGES_UPSERT",
  "MESSAGES_UPDATE",
];

/**
 * Behaviour of every instance. The full history sync makes WhatsApp hand
 * over all past chats on pairing, so imported contacts bring old messages.
 */
const INSTANCE_SETTINGS = {
  rejectCall: false,
  msgCall: "",
  groupsIgnore: true,
  alwaysOnline: false,
  readMessages: false,
  readStatus: false,
  syncFullHistory: true,
};

const REQUEST_TIMEOUT_MILLISECONDS = 60_000;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  /** Returns null instead of throwing when Evolution answers 404. */
  allowNotFound?: boolean;
}

/**
 * HTTP client for the Evolution API v2. Everything that reaches WhatsApp
 * goes through the throttle, so no caller can flood a number by mistake.
 */
@Injectable()
export class EvolutionApiService {
  private readonly logger = new Logger(EvolutionApiService.name);

  constructor(
    @Inject(evolutionConfig.KEY)
    private readonly configuration: ConfigType<typeof evolutionConfig>,
    private readonly throttleService: EvolutionThrottleService,
  ) {}

  get isConfigured() {
    return Boolean(this.configuration.url && this.configuration.apiKey);
  }

  instanceNameFor(userId: string) {
    return `${this.configuration.instancePrefix}-${userId}`;
  }

  webhookUrlFor(token: string) {
    if (!this.configuration.webhookBaseUrl) {
      throw new ServiceUnavailableException(
        "EVOLUTION_WEBHOOK_BASE_URL não configurada.",
      );
    }
    return `${this.configuration.webhookBaseUrl}/webhooks/evolution/${token}`;
  }

  /** With a number, WhatsApp also hands over a pairing code for that phone. */
  async createInstance(
    instanceName: string,
    webhookUrl: string,
    number?: string | null,
  ) {
    return this.request<{ qrcode?: EvolutionQrCode }>("/instance/create", {
      method: "POST",
      body: {
        instanceName,
        qrcode: true,
        ...(number ? { number } : {}),
        integration: "WHATSAPP-BAILEYS",
        ...INSTANCE_SETTINGS,
        webhook: this.webhookSettings(webhookUrl),
      },
    });
  }

  /** Brings an instance created with older settings up to date. */
  async applySettings(instanceName: string) {
    await this.request(`/settings/set/${instanceName}`, {
      method: "POST",
      body: INSTANCE_SETTINGS,
    });
  }

  async setWebhook(instanceName: string, webhookUrl: string) {
    await this.request(`/webhook/set/${instanceName}`, {
      method: "POST",
      body: { webhook: this.webhookSettings(webhookUrl) },
    });
  }

  async instanceExists(instanceName: string) {
    const instances = await this.request<EvolutionInstanceInformation[]>(
      `/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`,
      { allowNotFound: true },
    );
    return Array.isArray(instances) && instances.length > 0;
  }

  async fetchInstance(instanceName: string) {
    const instances = await this.request<EvolutionInstanceInformation[]>(
      `/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`,
      { allowNotFound: true },
    );
    return Array.isArray(instances) ? (instances[0] ?? null) : null;
  }

  async connect(instanceName: string, number?: string | null) {
    const query = number ? `?number=${encodeURIComponent(number)}` : "";
    return this.request<EvolutionQrCode>(
      `/instance/connect/${instanceName}${query}`,
    );
  }

  async connectionState(
    instanceName: string,
  ): Promise<EvolutionConnectionState> {
    const response = await this.request<{
      instance?: { state?: EvolutionConnectionState };
    }>(`/instance/connectionState/${instanceName}`, { allowNotFound: true });
    return response?.instance?.state ?? "close";
  }

  async logout(instanceName: string) {
    await this.request(`/instance/logout/${instanceName}`, {
      method: "DELETE",
      allowNotFound: true,
    }).catch((error: unknown) => {
      this.logger.warn(`Logout of ${instanceName} failed: ${String(error)}`);
    });
  }

  async deleteInstance(instanceName: string) {
    await this.request(`/instance/delete/${instanceName}`, {
      method: "DELETE",
      allowNotFound: true,
    });
  }

  async sendText(
    instanceName: string,
    number: string,
    text: string,
    context: SendContext = {},
  ) {
    return this.throttleService.scheduleSend(
      instanceName,
      { ...context, chat: number, text },
      (typingMilliseconds) =>
        this.request<EvolutionMessage>(`/message/sendText/${instanceName}`, {
          method: "POST",
          body: { number, text, linkPreview: true, delay: typingMilliseconds },
        }),
    );
  }

  async sendMedia(
    instanceName: string,
    number: string,
    media: {
      mediatype: EvolutionSendMediaType;
      mimetype: string;
      /** A link or base64. */
      media: string;
      caption?: string | null;
      fileName?: string | null;
    },
    context: SendContext = {},
  ) {
    return this.throttleService.scheduleSend(
      instanceName,
      { ...context, chat: number, text: media.caption },
      (typingMilliseconds) =>
        this.request<EvolutionMessage>(`/message/sendMedia/${instanceName}`, {
          method: "POST",
          body: {
            number,
            mediatype: media.mediatype,
            mimetype: media.mimetype,
            media: media.media,
            caption: media.caption ?? undefined,
            fileName: media.fileName ?? undefined,
            delay: typingMilliseconds,
          },
        }),
    );
  }

  /** Sends audio, a link or base64, as a voice note (Evolution converts it to opus). */
  async sendVoiceNote(
    instanceName: string,
    number: string,
    audio: string,
    context: SendContext = {},
  ) {
    return this.throttleService.scheduleSend(
      instanceName,
      { ...context, chat: number },
      (typingMilliseconds) =>
        this.request<EvolutionMessage>(
          `/message/sendWhatsAppAudio/${instanceName}`,
          {
            method: "POST",
            body: { number, audio, encoding: true, delay: typingMilliseconds },
          },
        ),
    );
  }

  async markAsRead(instanceName: string, keys: EvolutionMessageKey[]) {
    if (!keys.length) return;
    await this.throttleService
      .scheduleLookup(instanceName, () =>
        this.request(`/chat/markMessageAsRead/${instanceName}`, {
          method: "POST",
          body: {
            readMessages: keys.map((key) => ({
              remoteJid: key.remoteJid,
              fromMe: key.fromMe,
              id: key.id,
            })),
          },
        }),
      )
      .catch((error: unknown) => {
        this.logger.warn(`Mark as read failed: ${String(error)}`);
      });
  }

  async downloadMedia(
    instanceName: string,
    messageId: string,
    convertToMp4: boolean,
  ) {
    return this.throttleService.scheduleMedia(instanceName, () =>
      this.request<EvolutionMediaDownload>(
        `/chat/getBase64FromMediaMessage/${instanceName}`,
        {
          method: "POST",
          body: { message: { key: { id: messageId } }, convertToMp4 },
        },
      ),
    );
  }

  async fetchProfilePicture(instanceName: string, number: string) {
    const response = await this.throttleService
      .scheduleLookup(instanceName, () =>
        this.request<{ profilePictureUrl?: string | null }>(
          `/chat/fetchProfilePictureUrl/${instanceName}`,
          { method: "POST", body: { number }, allowNotFound: true },
        ),
      )
      .catch(() => null);
    return response?.profilePictureUrl ?? null;
  }

  /** Every contact the linked phone knows. */
  async findContacts(instanceName: string) {
    const contacts = await this.throttleService.scheduleRead(instanceName, () =>
      this.request<EvolutionContact[]>(`/chat/findContacts/${instanceName}`, {
        method: "POST",
        body: { where: {} },
        allowNotFound: true,
      }),
    );
    return Array.isArray(contacts) ? contacts : [];
  }

  /** Every chat with history on the linked phone, with its newest message. */
  async findChats(instanceName: string) {
    const chats = await this.throttleService.scheduleRead(instanceName, () =>
      this.request<EvolutionChat[]>(`/chat/findChats/${instanceName}`, {
        method: "POST",
        body: {},
        allowNotFound: true,
      }),
    );
    return Array.isArray(chats) ? chats : [];
  }

  /** The newest messages of one chat, in any order. */
  async findMessages(instanceName: string, remoteJid: string, limit: number) {
    const response = await this.throttleService.scheduleRead(instanceName, () =>
      this.request<EvolutionMessagePage>(`/chat/findMessages/${instanceName}`, {
        method: "POST",
        body: { where: { key: { remoteJid } }, page: 1, offset: limit },
        allowNotFound: true,
      }),
    );
    return response?.messages?.records ?? [];
  }

  private webhookSettings(url: string) {
    return {
      enabled: true,
      url,
      byEvents: false,
      base64: false,
      events: EVOLUTION_WEBHOOK_EVENTS,
    };
  }

  private async request<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException(
        "Integração com o WhatsApp não configurada.",
      );
    }

    const response = await fetch(`${this.configuration.url}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        apikey: this.configuration.apiKey,
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
    }).catch((error: unknown) => {
      this.logger.error(`Evolution unreachable on ${path}: ${String(error)}`);
      throw new ServiceUnavailableException(
        "Não foi possível falar com o WhatsApp agora.",
      );
    });

    if (response.status === 404 && options.allowNotFound) {
      return null as T;
    }

    const text = await response.text();
    const body: unknown = text ? safeJsonParse(text) : null;

    if (!response.ok) {
      this.logger.error(
        `Evolution ${options.method ?? "GET"} ${path} answered ${response.status}: ${text.substring(0, 500)}`,
      );
      throw new BadGatewayException(
        "O WhatsApp recusou o pedido. Confira a conexão e tente de novo.",
      );
    }

    return body as T;
  }
}

const safeJsonParse = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};
