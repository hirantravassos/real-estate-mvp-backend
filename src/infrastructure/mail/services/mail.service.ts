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
    const subject = this.getSubject(dto.template);
    await this.mailerService
      .sendMail({
        subject,
        to: dto.sendTo,
        template: dto.template,
        context: {
          ...dto.context,
        },
      })
      .then(() => {
        this.logger.debug(`Email sent: ${JSON.stringify(dto)}`);
      })
      .catch((err) => {
        this.logger.error("Email was not sent because of error", err, { dto });
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
