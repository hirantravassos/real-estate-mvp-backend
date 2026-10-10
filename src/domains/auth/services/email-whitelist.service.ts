import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class EmailWhitelistService {
  private readonly whitelistedEmails: ReadonlySet<string>;

  constructor(private readonly configService: ConfigService) {
    const rawEmailWhitelist =
      this.configService.get<string>("auth.emailWhitelist") ?? "";

    this.whitelistedEmails = new Set(
      rawEmailWhitelist
        .split(/[\s,;]+/)
        .map((email) => this.normalize(email))
        .filter((email) => email.length > 0),
    );

    if (this.whitelistedEmails.size === 0) {
      throw new Error(
        "AUTH_EMAIL_WHITELIST must contain at least one email, otherwise nobody can access the system",
      );
    }
  }

  isAllowed(email: string | null | undefined): boolean {
    if (!email) {
      return false;
    }

    return this.whitelistedEmails.has(this.normalize(email));
  }

  private normalize(email: string): string {
    return email.trim().toLowerCase();
  }
}
