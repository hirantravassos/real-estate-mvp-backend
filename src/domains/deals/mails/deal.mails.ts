import { MailMessage } from "../../../infrastructure/mail/templates/mail-layout.template";
import { BrokerMailContext } from "../../notifications/services/broker-mail.service";

/**
 * The broker is told what happened, never who: names, documents and the
 * contract stay behind the login, in the negotiation page.
 */
const dealAction = (context: BrokerMailContext, dealId: string) => ({
  label: "Abrir a negociação",
  url: context.appUrl(`/deals/${encodeURIComponent(dealId)}`),
});

export const govbrCopySubmittedMail = (
  context: BrokerMailContext,
  dealId: string,
): MailMessage => ({
  kind: "deal-govbr-copy-submitted",
  subject: "Uma assinatura gov.br espera sua conferência",
  preheader: "Confira a cópia assinada para seguir com o contrato.",
  heading: "Assinatura enviada para conferência",
  paragraphs: [
    `Olá, ${context.firstName}!`,
    "Um dos signatários enviou o contrato assinado pelo gov.br. Confira a cópia na negociação para validar a assinatura ou pedir que seja refeita.",
  ],
  action: dealAction(context, dealId),
});

export const contractSignedMail = (
  context: BrokerMailContext,
  dealId: string,
): MailMessage => ({
  kind: "deal-contract-signed",
  subject: "Contrato assinado por todos",
  preheader: "A negociação segue para o fechamento.",
  heading: "Contrato assinado por todos! 🎉",
  paragraphs: [
    `Parabéns, ${context.firstName}!`,
    "Todos os signatários assinaram o contrato da sua negociação. Ela já segue para a etapa de fechamento, com pagamento e registro.",
  ],
  action: dealAction(context, dealId),
});
