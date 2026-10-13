import {
  formatMailCount,
  formatMailCurrency,
  formatMailDate,
} from "../../../infrastructure/mail/templates/mail-format.helper";
import { MailMessage } from "../../../infrastructure/mail/templates/mail-layout.template";
import { BrokerMailContext } from "../../notifications/services/broker-mail.service";
import { SubscriptionPlan } from "../constants/subscription-plans.constant";
import { SubscriptionPaymentMethod } from "../enums/subscription.enum";

const SUBSCRIPTION_PATH = "/assinatura";

const METHOD_LABELS: Record<SubscriptionPaymentMethod, string> = {
  [SubscriptionPaymentMethod.CARD]: "Cartão de crédito, cobrança automática",
  [SubscriptionPaymentMethod.PIX]: "Pix",
};

const PIX_RENEWAL_NOTE =
  "O Pix não renova sozinho. Avisaremos por e-mail quando a renovação do próximo mês abrir, ou cadastre um cartão para a cobrança ser automática.";

const subscriptionAction = (context: BrokerMailContext, label: string) => ({
  label,
  url: context.appUrl(SUBSCRIPTION_PATH),
});

export interface SubscriptionConfirmedMailInput {
  plan: SubscriptionPlan;
  method: SubscriptionPaymentMethod;
  amountInBrl: number;
  /** Card: when the first charge happens, null when it is charged now. */
  firstChargeAt?: Date | null;
  /** Pix: end of the month just paid. */
  paidThrough?: Date | null;
}

export const subscriptionConfirmedMail = (
  context: BrokerMailContext,
  input: SubscriptionConfirmedMailInput,
): MailMessage => {
  const details = [
    { label: "Plano", value: input.plan.name },
    { label: "Valor mensal", value: formatMailCurrency(input.amountInBrl) },
    { label: "Forma de pagamento", value: METHOD_LABELS[input.method] },
    {
      label: "Créditos de IA por mês",
      value: formatMailCount(input.plan.monthlyCredits),
    },
  ];
  if (input.method === SubscriptionPaymentMethod.CARD) {
    details.push({
      label: "Primeira cobrança",
      value: input.firstChargeAt ? formatMailDate(input.firstChargeAt) : "Hoje",
    });
  }
  if (input.paidThrough) {
    details.push({
      label: "Pago até",
      value: formatMailDate(input.paidThrough),
    });
  }

  return {
    kind: "subscription-confirmed",
    subject: `Assinatura confirmada: plano ${input.plan.name}`,
    preheader: `Seu plano ${input.plan.name} está ativo.`,
    heading: "Sua assinatura está confirmada",
    paragraphs: [
      `Olá, ${context.firstName}!`,
      `Confirmamos a assinatura do plano ${input.plan.name} no BrokerIn. Confira os detalhes abaixo e guarde este e-mail como comprovante.`,
    ],
    details,
    action: subscriptionAction(context, "Ver minha assinatura"),
    footnote:
      input.method === SubscriptionPaymentMethod.PIX
        ? PIX_RENEWAL_NOTE
        : "Você pode trocar de plano ou cancelar a renovação quando quiser, na página da assinatura.",
  };
};

export const subscriptionThanksMail = (
  context: BrokerMailContext,
  plan: SubscriptionPlan,
): MailMessage => ({
  kind: "subscription-thanks",
  subject: "Obrigado por assinar o BrokerIn",
  preheader: "Que bom ter você com a gente.",
  heading: `Obrigado, ${context.firstName}!`,
  paragraphs: [
    "Ficamos muito felizes com a sua assinatura. Cada cliente bem atendido e cada negócio fechado com a ajuda do BrokerIn é o motivo de a gente existir.",
    `Veja o que o plano ${plan.name} libera para você:`,
    ...plan.features.map((feature) => `✓ ${feature}`),
    "Conte com a gente nessa jornada. Bons negócios!",
  ],
  action: { label: "Abrir o BrokerIn", url: context.appUrl("/home") },
});

export interface PaymentReceivedMailInput {
  plan: SubscriptionPlan;
  method: SubscriptionPaymentMethod;
  amountInBrl: number;
  credits: number;
  periodStart: Date;
  periodEnd: Date;
}

export const paymentReceivedMail = (
  context: BrokerMailContext,
  input: PaymentReceivedMailInput,
): MailMessage => ({
  kind: "subscription-payment-received",
  subject: `Pagamento confirmado: plano ${input.plan.name}`,
  preheader: `Seu plano está garantido até ${formatMailDate(input.periodEnd)}.`,
  heading: "Recebemos seu pagamento",
  paragraphs: [
    `Olá, ${context.firstName}!`,
    `O pagamento do plano ${input.plan.name} foi confirmado. Obrigado por continuar com a gente!`,
  ],
  details: [
    { label: "Plano", value: input.plan.name },
    { label: "Valor", value: formatMailCurrency(input.amountInBrl) },
    { label: "Forma de pagamento", value: METHOD_LABELS[input.method] },
    {
      label: "Período",
      value: `${formatMailDate(input.periodStart)} a ${formatMailDate(input.periodEnd)}`,
    },
    {
      label: "Créditos de IA adicionados",
      value: formatMailCount(input.credits),
    },
  ],
  action: subscriptionAction(context, "Ver minha assinatura"),
  footnote:
    input.method === SubscriptionPaymentMethod.PIX
      ? PIX_RENEWAL_NOTE
      : `A próxima cobrança no cartão será em ${formatMailDate(input.periodEnd)}.`,
});

export const paymentFailedMail = (
  context: BrokerMailContext,
  input: { reason: string; graceEndsAt: Date | null },
): MailMessage => ({
  kind: "subscription-payment-failed",
  subject: "Não conseguimos cobrar sua assinatura",
  preheader: "Atualize o pagamento para não perder o acesso.",
  heading: "Houve um problema com o pagamento",
  paragraphs: [
    `Olá, ${context.firstName}.`,
    input.reason,
    input.graceEndsAt
      ? `Seu acesso continua liberado até ${formatMailDate(input.graceEndsAt)}. Depois disso a plataforma fica fechada até o pagamento, mas seus dados continuam guardados.`
      : "Regularize o pagamento para continuar usando a plataforma. Seus dados continuam guardados.",
  ],
  action: subscriptionAction(context, "Atualizar pagamento"),
});

export const subscriptionCanceledMail = (
  context: BrokerMailContext,
  input: { planName: string; accessUntil: Date | null },
): MailMessage => ({
  kind: "subscription-canceled",
  subject: "Sua assinatura foi cancelada",
  preheader: "Nenhuma nova cobrança será feita.",
  heading: "Cancelamento confirmado",
  paragraphs: [
    `Olá, ${context.firstName}.`,
    `Confirmamos o cancelamento da renovação do plano ${input.planName}. Nenhuma nova cobrança será feita.`,
    input.accessUntil
      ? `Você continua com acesso até ${formatMailDate(input.accessUntil)}.`
      : "O acesso termina ao fim do período já pago.",
    "Se mudar de ideia, é só assinar de novo. Seus dados continuam guardados.",
  ],
  action: subscriptionAction(context, "Ver minha assinatura"),
});

export const planChangedMail = (
  context: BrokerMailContext,
  input: { plan: SubscriptionPlan; effectiveFrom: Date | null },
): MailMessage => ({
  kind: "subscription-plan-changed",
  subject: `Troca de plano confirmada: ${input.plan.name}`,
  preheader: `Seu próximo mês será no plano ${input.plan.name}.`,
  heading: "Troca de plano confirmada",
  paragraphs: [
    `Olá, ${context.firstName}!`,
    input.effectiveFrom
      ? `A partir de ${formatMailDate(input.effectiveFrom)}, sua assinatura passa para o plano ${input.plan.name}.`
      : `Seu próximo mês será no plano ${input.plan.name}.`,
    "O período já pago continua no plano atual, nada é cobrado duas vezes.",
  ],
  details: [
    { label: "Novo plano", value: input.plan.name },
    { label: "Valor mensal", value: formatMailCurrency(input.plan.priceInBrl) },
    {
      label: "Créditos de IA por mês",
      value: formatMailCount(input.plan.monthlyCredits),
    },
  ],
  action: subscriptionAction(context, "Ver minha assinatura"),
});

export const cardUpdatedMail = (
  context: BrokerMailContext,
  input: { plan: SubscriptionPlan; nextChargeAt: Date | null },
): MailMessage => ({
  kind: "subscription-card-updated",
  subject: "Cartão da assinatura atualizado",
  preheader: "As próximas cobranças vão para o novo cartão.",
  heading: "Cartão atualizado",
  paragraphs: [
    `Olá, ${context.firstName}.`,
    "O cartão da sua assinatura foi trocado. As próximas cobranças serão feitas no novo cartão e o anterior não é mais cobrado.",
  ],
  details: [
    { label: "Plano", value: input.plan.name },
    { label: "Valor mensal", value: formatMailCurrency(input.plan.priceInBrl) },
    {
      label: "Próxima cobrança",
      value: input.nextChargeAt ? formatMailDate(input.nextChargeAt) : "Hoje",
    },
  ],
  action: subscriptionAction(context, "Ver minha assinatura"),
  footnote:
    "Não foi você? Entre na plataforma, revise sua assinatura e saia de todos os dispositivos.",
});

export const trialEndingMail = (
  context: BrokerMailContext,
  input: { trialEndsAt: Date },
): MailMessage => ({
  kind: "subscription-trial-ending",
  subject: `Seu teste grátis termina em ${formatMailDate(input.trialEndsAt)}`,
  preheader: "Escolha um plano para continuar sem interrupção.",
  heading: "Seu teste grátis está acabando",
  paragraphs: [
    `Olá, ${context.firstName}!`,
    `Seu teste grátis do BrokerIn termina em ${formatMailDate(input.trialEndsAt)}.`,
    "Para continuar com seus clientes, imóveis e o atendimento no WhatsApp sem interrupção, escolha um plano. Seus dados continuam guardados.",
  ],
  action: subscriptionAction(context, "Escolher meu plano"),
});

export const renewalDueMail = (
  context: BrokerMailContext,
  input: { planName: string; paidThrough: Date; renewalOpensAt: Date | null },
): MailMessage => ({
  kind: "subscription-renewal-due",
  subject: `Seu plano vence em ${formatMailDate(input.paidThrough)}`,
  preheader: "Renove com Pix para não perder o acesso.",
  heading: "Hora de renovar seu plano",
  paragraphs: [
    `Olá, ${context.firstName}!`,
    `Seu plano ${input.planName} está pago até ${formatMailDate(input.paidThrough)}. Como o pagamento é por Pix, a renovação é feita por você a cada mês.`,
    input.renewalOpensAt
      ? `A renovação abre em ${formatMailDate(input.renewalOpensAt)}.`
      : "A renovação já está aberta, o Pix sai em poucos segundos.",
    "Se preferir não se preocupar mais com isso, cadastre um cartão e a cobrança passa a ser automática.",
  ],
  action: subscriptionAction(context, "Renovar agora"),
});
