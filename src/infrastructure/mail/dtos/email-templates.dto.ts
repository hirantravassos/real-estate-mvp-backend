interface EmailWelcomeTemplate {
  name: string;
}

interface EmailPasswordRecoveryTemplate {
  email: string;
  name: string;
}

interface EmailDefaultTemplate {
  message: string;
}

export type MailTemplateDto = {
  default: EmailDefaultTemplate;
  welcome: EmailWelcomeTemplate;
  "password-recovery": EmailPasswordRecoveryTemplate;
};
