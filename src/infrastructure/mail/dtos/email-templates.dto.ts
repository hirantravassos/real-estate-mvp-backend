interface EmailWelcomeTemplate {
  name: string;
}

interface EmailPasswordRecoveryTemplate {
  email: string;
  name: string;
}

interface EmailDefaultTemplate {
  title: string;
  message: string;
}

export type MailTemplateDto = {
  default: EmailDefaultTemplate;
  welcome: EmailWelcomeTemplate;
  "password-recovery": EmailPasswordRecoveryTemplate;
};
