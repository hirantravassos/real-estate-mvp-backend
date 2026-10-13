import { formatMailDate } from "../../../infrastructure/mail/templates/mail-format.helper";
import { MailMessage } from "../../../infrastructure/mail/templates/mail-layout.template";
import { BrokerMailContext } from "../../notifications/services/broker-mail.service";

export const erasureWarningMail = (
  context: BrokerMailContext,
  input: { erasureAt: Date },
): MailMessage => ({
  kind: "account-erasure-warning",
  subject: `Sua conta será excluída em ${formatMailDate(input.erasureAt)}`,
  preheader: "Assine um plano para manter seus dados.",
  heading: "Seus dados serão apagados em breve",
  paragraphs: [
    `Olá, ${context.firstName}.`,
    `Sua conta está sem assinatura ativa há quase 90 dias. Como prevê a Política de Privacidade, em ${formatMailDate(input.erasureAt)} ela será excluída, com os clientes, imóveis, conversas, negociações e arquivos.`,
    "Para manter tudo, é só escolher um plano antes dessa data.",
  ],
  action: { label: "Manter minha conta", url: context.appUrl("/assinatura") },
});
