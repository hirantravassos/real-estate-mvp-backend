import { Injectable, Logger } from "@nestjs/common";
import { MailerService } from "@nestjs-modules/mailer";
import {
  MailMessage,
  renderMailHtml,
  renderMailText,
} from "../templates/mail-layout.template";

/** Anonymized accounts end in .invalid, nobody reads those. */
const DELIVERABLE_ADDRESS = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const UNDELIVERABLE_DOMAIN = /\.invalid$/i;

export const isDeliverableAddress = (address: string | null | undefined) =>
  Boolean(
    address &&
    address.length <= 254 &&
    DELIVERABLE_ADDRESS.test(address) &&
    !UNDELIVERABLE_DOMAIN.test(address),
  );

/** Never two header lines out of one subject. */
const singleLine = (value: string) => value.replace(/[\r\n]+/g, " ").trim();

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  /**
   * Sends one transactional mail. Never throws: a mail that fails is logged
   * and the flow that asked for it carries on.
   */
  async send(to: string, message: MailMessage): Promise<boolean> {
    if (!isDeliverableAddress(to)) return false;

    try {
      await this.mailerService.sendMail({
        to,
        subject: singleLine(message.subject),
        html: renderMailHtml(message),
        text: renderMailText(message),
      });
      return true;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Mail ${message.kind} not sent: ${reason}`);
      return false;
    }
  }
}
