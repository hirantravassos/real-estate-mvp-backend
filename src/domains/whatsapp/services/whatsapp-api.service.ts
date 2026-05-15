import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface MetaPhoneNumber {
  id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating: string;
  platform_type: string;
}

export interface MetaWaba {
  id: string;
  name: string;
  currency: string;
  timezone_id: string;
}

export interface MetaBusiness {
  id: string;
  name: string;
}

export interface MetaUserInfo {
  id: string;
  name: string;
  email?: string;
}

export interface MetaLongLivedToken {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

@Injectable()
export class WhatsappApiService {
  private readonly logger = new Logger(WhatsappApiService.name);

  constructor(private readonly configService: ConfigService) {}

  private get apiVersion(): string {
    return this.configService.get<string>("whatsapp.apiVersion", "v22.0");
  }

  private get appId(): string {
    return this.configService.getOrThrow<string>("whatsapp.appId");
  }

  private get appSecret(): string {
    return this.configService.getOrThrow<string>("whatsapp.appSecret");
  }

  private baseUrl(path: string): string {
    return `https://graph.facebook.com/${this.apiVersion}${path}`;
  }

  private async get<T>(path: string, token: string): Promise<T> {
    const url = new URL(this.baseUrl(path));
    url.searchParams.set("access_token", token);
    const response = await fetch(url.toString());
    const data = (await response.json()) as T & { error?: { message: string } };
    if (!response.ok) {
      const err = (data as { error?: { message: string } }).error;
      throw new Error(err?.message ?? `Meta API error: ${response.status}`);
    }
    return data;
  }

  private async post<T>(
    path: string,
    token: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const response = await fetch(this.baseUrl(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as T & { error?: { message: string } };
    if (!response.ok) {
      const err = (data as { error?: { message: string } }).error;
      throw new Error(err?.message ?? `Meta API error: ${response.status}`);
    }
    return data;
  }

  async exchangeForLongLivedToken(shortLivedToken: string): Promise<string> {
    const url = new URL("https://graph.facebook.com/oauth/access_token");
    url.searchParams.set("grant_type", "fb_exchange_token");
    url.searchParams.set("client_id", this.appId);
    url.searchParams.set("client_secret", this.appSecret);
    url.searchParams.set("fb_exchange_token", shortLivedToken);

    const response = await fetch(url.toString());
    const data = (await response.json()) as MetaLongLivedToken & {
      error?: { message: string };
    };

    if (!response.ok || data.error) {
      throw new Error(data.error?.message ?? "Failed to exchange token");
    }

    return data.access_token;
  }

  async getUserInfo(token: string): Promise<MetaUserInfo> {
    return this.get<MetaUserInfo>("/me?fields=id,name,email", token);
  }

  async getBusinessPortfolios(token: string): Promise<MetaBusiness[]> {
    const response = await this.get<{ data: MetaBusiness[] }>(
      "/me/businesses",
      token,
    );
    return response.data ?? [];
  }

  async getOwnedWabas(businessId: string, token: string): Promise<MetaWaba[]> {
    const response = await this.get<{ data: MetaWaba[] }>(
      `/${businessId}/owned_whatsapp_business_accounts`,
      token,
    );
    return response.data ?? [];
  }

  async getPhoneNumbers(wabaId: string, token: string): Promise<MetaPhoneNumber[]> {
    const response = await this.get<{ data: MetaPhoneNumber[] }>(
      `/${wabaId}/phone_numbers`,
      token,
    );
    return response.data ?? [];
  }

  async requestVerificationCode(
    phoneNumberId: string,
    token: string,
    codeMethod: "SMS" | "VOICE" = "SMS",
    language = "en_US",
  ): Promise<void> {
    await this.post<{ success: boolean }>(
      `/${phoneNumberId}/request_code`,
      token,
      { code_method: codeMethod, language },
    );
  }

  async verifyCode(
    phoneNumberId: string,
    token: string,
    code: string,
  ): Promise<void> {
    await this.post<{ success: boolean }>(`/${phoneNumberId}/verify_code`, token, {
      code,
    });
  }

  async sendTextMessage(
    phoneNumberId: string,
    token: string,
    to: string,
    text: string,
  ): Promise<{ messages: Array<{ id: string }> }> {
    return this.post<{ messages: Array<{ id: string }> }>(
      `/${phoneNumberId}/messages`,
      token,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body: text },
      },
    );
  }

  async markMessageAsRead(
    phoneNumberId: string,
    token: string,
    messageId: string,
  ): Promise<void> {
    await this.post<{ success: boolean }>(`/${phoneNumberId}/messages`, token, {
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    });
  }
}
