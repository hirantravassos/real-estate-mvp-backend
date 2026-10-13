import { MailMessage } from "../../../infrastructure/mail/templates/mail-layout.template";
import { BrokerMailContext } from "../../notifications/services/broker-mail.service";

export enum AccountDeletionReason {
  /** The broker asked for it, in the settings. */
  REQUESTED = "requested",
  /** The retention sweep, 90 days after the access ended. */
  RETENTION = "retention",
}

export const accountDeletedMail = (
  context: BrokerMailContext,
  reason: AccountDeletionReason,
): MailMessage => ({
  kind: "account-deleted",
  subject: "Sua conta no BrokerIn foi excluída",
  preheader: "Seus dados foram apagados.",
  heading: "Conta excluída",
  paragraphs: [
    `Olá, ${context.firstName}.`,
    reason === AccountDeletionReason.RETENTION
      ? "Como sua assinatura ficou mais de 90 dias sem acesso, sua conta foi excluída, conforme os Termos de Uso e a Política de Privacidade."
      : "Confirmamos a exclusão da sua conta, como você pediu.",
    "Os clientes, imóveis, conversas, negociações e arquivos foram apagados. Guardamos apenas os registros de pagamento que a lei exige, sem nada que identifique você.",
    "Este é o último e-mail que enviamos para este endereço. Se quiser voltar, é só criar uma nova conta.",
  ],
  footnote:
    "Não pediu a exclusão? Entre em contato com o nosso encarregado de dados pelo canal indicado na Política de Privacidade.",
});
