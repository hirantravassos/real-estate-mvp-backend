import { formatMailCount } from "../../../infrastructure/mail/templates/mail-format.helper";
import { MailMessage } from "../../../infrastructure/mail/templates/mail-layout.template";
import { BrokerMailContext } from "../../notifications/services/broker-mail.service";

export interface WelcomeMailInput {
  trialDays: number;
  trialCredits: number;
  /** A Google account that deleted an earlier account gets no new trial. */
  returning: boolean;
}

export const welcomeMail = (
  context: BrokerMailContext,
  input: WelcomeMailInput,
): MailMessage => {
  const trialParagraphs = input.returning
    ? [
        "Que bom ver você de volta! Seu teste grátis já foi usado na conta anterior, então é só escolher um plano para começar.",
      ]
    : [
        `Você tem ${input.trialDays} dias grátis para conhecer tudo${input.trialCredits > 0 ? `, com ${formatMailCount(input.trialCredits)} créditos de IA de presente` : ""}. Não pedimos cartão para o teste.`,
      ];

  return {
    kind: "welcome",
    subject: "Boas vindas ao BrokerIn",
    preheader: "Sua conta está pronta.",
    heading: `Boas vindas, ${context.firstName}!`,
    paragraphs: [
      "Sua conta no BrokerIn está pronta. Aqui seus clientes, imóveis, visitas e o atendimento no WhatsApp ficam no mesmo lugar, com a IA ajudando em cada etapa.",
      ...trialParagraphs,
      "Para começar bem: conecte seu WhatsApp, cadastre seus primeiros imóveis e complete sua página pública de corretor.",
    ],
    action: input.returning
      ? { label: "Escolher meu plano", url: context.appUrl("/assinatura") }
      : { label: "Começar agora", url: context.appUrl("/home") },
    footnote:
      "Não criou esta conta? Ignore este e-mail, nada será cobrado sem a sua escolha de um plano.",
  };
};
