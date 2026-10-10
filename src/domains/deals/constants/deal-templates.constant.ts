import { DealParty, DealPaymentMethod } from "../enums/deal.enum";

export interface DealChecklistTemplate {
  party: DealParty;
  title: string;
  description: string | null;
  requestedFromCustomer: boolean;
}

interface DealTemplateOptions {
  paymentMethod: DealPaymentMethod | null;
  usesFgts: boolean;
}

const usesCredit = (paymentMethod: DealPaymentMethod | null) =>
  paymentMethod === DealPaymentMethod.FINANCING ||
  paymentMethod === DealPaymentMethod.CONSORTIUM;

/** The usual paperwork of a Brazilian home sale, tuned to how it is paid. */
export const buildChecklistTemplate = (
  options: DealTemplateOptions,
): DealChecklistTemplate[] => {
  const { paymentMethod, usesFgts } = options;
  const buyer: DealChecklistTemplate[] = [
    {
      party: DealParty.BUYER,
      title: "RG e CPF ou CNH",
      description: "Frente e verso, de todos os compradores.",
      requestedFromCustomer: true,
    },
    {
      party: DealParty.BUYER,
      title: "Certidão de nascimento ou casamento",
      description: "Se casado, também os documentos do cônjuge.",
      requestedFromCustomer: true,
    },
    {
      party: DealParty.BUYER,
      title: "Comprovante de residência",
      description: "Conta de luz, água ou telefone dos últimos 90 dias.",
      requestedFromCustomer: true,
    },
  ];

  if (usesCredit(paymentMethod)) {
    buyer.push(
      {
        party: DealParty.BUYER,
        title: "Comprovantes de renda",
        description: "Os três últimos holerites ou extratos, se autônomo.",
        requestedFromCustomer: true,
      },
      {
        party: DealParty.BUYER,
        title: "Declaração do Imposto de Renda",
        description: "A última entregue, com o recibo.",
        requestedFromCustomer: true,
      },
    );
  }

  if (usesFgts) {
    buyer.push({
      party: DealParty.BUYER,
      title: "Extrato do FGTS e carteira de trabalho",
      description: "Extrato atualizado pelo app do FGTS.",
      requestedFromCustomer: true,
    });
  }

  const seller: DealChecklistTemplate[] = [
    {
      party: DealParty.SELLER,
      title: "RG e CPF dos vendedores",
      description: null,
      requestedFromCustomer: false,
    },
    {
      party: DealParty.SELLER,
      title: "Certidão de estado civil dos vendedores",
      description: null,
      requestedFromCustomer: false,
    },
    {
      party: DealParty.SELLER,
      title: "Certidões negativas dos vendedores",
      description: "Cível, trabalhista, protestos e Receita Federal.",
      requestedFromCustomer: false,
    },
  ];

  const property: DealChecklistTemplate[] = [
    {
      party: DealParty.PROPERTY,
      title: "Matrícula atualizada do imóvel",
      description: "Certidão de ônus reais emitida há menos de 30 dias.",
      requestedFromCustomer: false,
    },
    {
      party: DealParty.PROPERTY,
      title: "Certidão negativa de IPTU",
      description: null,
      requestedFromCustomer: false,
    },
    {
      party: DealParty.PROPERTY,
      title: "Declaração de quitação do condomínio",
      description: "Quando o imóvel tiver condomínio.",
      requestedFromCustomer: false,
    },
  ];

  if (usesCredit(paymentMethod)) {
    property.push({
      party: DealParty.PROPERTY,
      title: "Laudo de avaliação",
      description: "Feito pelo banco ou pela administradora.",
      requestedFromCustomer: false,
    });
  }

  return [...buyer, ...seller, ...property];
};

/** The road from the signed contract to the keys. */
export const buildMilestoneTemplate = (
  options: DealTemplateOptions,
): string[] => {
  const { paymentMethod } = options;
  const start = ["Proposta aceita", "Sinal pago"];
  const end = [
    "ITBI pago",
    "Registro no cartório de imóveis",
    "Entrega das chaves",
  ];

  switch (paymentMethod) {
    case DealPaymentMethod.FINANCING:
      return [
        ...start,
        "Crédito aprovado pelo banco",
        "Avaliação do imóvel pelo banco",
        "Contrato do banco assinado",
        ...end,
      ];
    case DealPaymentMethod.CONSORTIUM:
      return [
        ...start,
        "Carta de crédito liberada",
        "Avaliação do imóvel pela administradora",
        ...end,
      ];
    case DealPaymentMethod.INSTALLMENTS:
      return [
        ...start,
        "Primeira parcela paga",
        "Escritura no cartório de notas",
        ...end,
      ];
    default:
      return [...start, "Escritura no cartório de notas", "Saldo pago", ...end];
  }
};
