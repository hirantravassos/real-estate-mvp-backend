import { Inject, Injectable, Logger } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { appConfig } from "../../../config/app.config";
import { MailService } from "../../../infrastructure/mail/services/mail.service";
import { MailMessage } from "../../../infrastructure/mail/templates/mail-layout.template";
import { User } from "../../users/entities/user.entity";

export interface BrokerMailContext {
  firstName: string;
  /** Absolute link to a page of the app, from a path like /assinatura. */
  appUrl: (path: string) => string;
}

export type BrokerMailBuilder = (
  context: BrokerMailContext,
) => MailMessage | MailMessage[];

/** The broker as loaded now, or a copy kept before the account was erased. */
type BrokerRecipient = Pick<User, "id" | "email" | "name">;

const firstNameOf = (name: string | null | undefined) =>
  (name ?? "").trim().split(/\s+/)[0] || "corretor";

/**
 * Mails to the broker about their own account. Only the broker is written
 * to, never a customer or a signer, and the mails carry no third party data.
 */
@Injectable()
export class BrokerMailService {
  private readonly logger = new Logger(BrokerMailService.name);

  constructor(
    @Inject(appConfig.KEY)
    private readonly applicationConfiguration: ConfigType<typeof appConfig>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly mailService: MailService,
  ) {}

  /**
   * Fire and forget: the mail never delays nor fails the request or the
   * webhook that sent it. A user id is loaded fresh, an inactive account is
   * never written to.
   */
  notify(recipient: string | BrokerRecipient, build: BrokerMailBuilder): void {
    void this.deliver(recipient, build).catch((error: unknown) =>
      this.logger.error(`Broker mail not sent: ${String(error)}`),
    );
  }

  async deliver(
    recipient: string | BrokerRecipient,
    build: BrokerMailBuilder,
  ): Promise<void> {
    const broker =
      typeof recipient === "string"
        ? await this.userRepository.findOneBy({ id: recipient, active: true })
        : recipient;
    if (!broker?.email) return;

    const context: BrokerMailContext = {
      firstName: firstNameOf(broker.name),
      appUrl: (path) => this.appUrl(path),
    };
    const built = build(context);
    for (const message of Array.isArray(built) ? built : [built]) {
      await this.mailService.send(broker.email, message);
    }
  }

  private appUrl(path: string) {
    const safePath =
      path.startsWith("/") && !path.startsWith("//") ? path : "/";
    return `${this.applicationConfiguration.frontendUrl}${safePath}`;
  }
}
