import {
  formatMailCount,
  formatMailCurrency,
} from "../../../infrastructure/mail/templates/mail-format.helper";
import { MailMessage } from "../../../infrastructure/mail/templates/mail-layout.template";
import { BrokerMailContext } from "../../notifications/services/broker-mail.service";

export const creditPurchasePaidMail = (
  context: BrokerMailContext,
  input: { credits: number; amountInBrl: number },
): MailMessage => ({
  kind: "credit-purchase-paid",
  subject: `Compra confirmada: ${formatMailCount(input.credits)} créditos de IA`,
  preheader: "Os créditos já estão na sua carteira.",
  heading: "Seus créditos chegaram",
  paragraphs: [
    `Olá, ${context.firstName}!`,
    "Recebemos o seu Pix e os créditos de IA já estão na sua carteira, prontos para usar. Obrigado pela compra!",
  ],
  details: [
    { label: "Créditos", value: formatMailCount(input.credits) },
    { label: "Valor", value: formatMailCurrency(input.amountInBrl) },
    { label: "Forma de pagamento", value: "Pix" },
  ],
  action: { label: "Ver meus créditos", url: context.appUrl("/settings") },
});
