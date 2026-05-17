import { MailTemplateDto } from "./email-templates.dto";

export type EmailSendDto<T extends keyof MailTemplateDto> = {
  sendTo: string;
  template: T;
  context: MailTemplateDto[T];
};
