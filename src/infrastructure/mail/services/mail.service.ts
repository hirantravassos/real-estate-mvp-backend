import { Injectable, Logger } from "@nestjs/common";
import { MailerService } from "@nestjs-modules/mailer";
import { EmailSendDto } from "../dtos/email-send.dto";
import { MailTemplateDto } from "../dtos/email-templates.dto";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  public async sendEmail<T extends keyof MailTemplateDto>(
    dto: EmailSendDto<T>,
  ): Promise<void> {
    await this.mailerService
      .sendMail({
        to: dto.sendTo,
        subject: this.getSubject(dto.template),
        template: dto.template,
        context: dto.context,
      })
      .catch((err) => {
        this.logger.error("Email was not sent because of error", err);
      });
  }

  private getSubject(templateKey: keyof MailTemplateDto): string {
    switch (templateKey) {
      case "welcome":
        return "Bem vindo à BrokerIn!";
      case "password-recovery":
        return "Reset your Password";
      case "default":
        return "Notification from System";
    }
  }
}
