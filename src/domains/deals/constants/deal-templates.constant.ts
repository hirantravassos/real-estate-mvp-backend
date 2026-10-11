import {
  DealParty,
  DealPaymentMethod,
  DealSellerType,
} from "../enums/deal.enum";

export interface DealChecklistTemplate {
  party: DealParty;
  title: string;
  description: string | null;
  requestedFromCustomer: boolean;
  screening: boolean;
}

interface DealTemplateOptions {
  paymentMethod: DealPaymentMethod | null;
  usesFgts: boolean;
  sellerType: DealSellerType;
}

const usesCredit = (paymentMethod: DealPaymentMethod | null) =>
  paymentMethod === DealPaymentMethod.FINANCING ||
  paymentMethod === DealPaymentMethod.CONSORTIUM;

const sellerDocument = (
  title: string,
  description: string | null,
): DealChecklistTemplate => ({
  party: DealParty.SELLER,
  title,
  description,
  requestedFromCustomer: false,
  screening: false,
});

const sellerScreening = (
  title: string,
  description: string,
): DealChecklistTemplate => ({
  ...sellerDocument(title, description),
  screening: true,
});

const propertyDocument = (
  title: string,
  description: string | null,
  screening = false,
): DealChecklistTemplate => ({
  party: DealParty.PROPERTY,
  title,
  description,
  requestedFromCustomer: false,
  screening,
});

interface ScreeningSubject {
  /** "CPF" or "CNPJ". */
  documentName: string;
  /** "dos vendedores", "da empresa". */
  whose: string;
}

/**
 * Searches that show whether the owner is free to sell: clean name, taxes,
 * lawsuits, protests and frozen assets. A positive result can make the sale
 * void later, as fraud against creditors or against a running lawsuit.
 */
const buildOwnerScreening = (
  subject: ScreeningSubject,
): DealChecklistTemplate[] => {
  const { documentName, whose } = subject;
  return [
    sellerScreening(
      "Consulta de nome limpo",
      `Serasa, SPC e Boa Vista pelo ${documentName} ${whose}, com autorização. Dívidas altas podem virar penhora do imóvel.`,
    ),
    sellerScreening(
      `Situação cadastral do ${documentName}`,
      "Precisa estar regular ou ativo na Receita Federal.",
    ),
    sellerScreening(
      "Certidão de débitos federais",
      `Certidão conjunta da Receita Federal e PGFN ${whose}. Inclui dívida ativa da União e INSS.`,
    ),
    sellerScreening(
      "Certidão de débitos estaduais",
      `Secretaria da Fazenda do estado, pelo ${documentName} ${whose}.`,
    ),
    sellerScreening(
      "Certidão de débitos municipais",
      `Tributos ${whose} na prefeitura do domicílio ou da sede.`,
    ),
    sellerScreening(
      "Certidão de ações cíveis e execuções fiscais",
      "Justiça Estadual da comarca do imóvel e do domicílio, dos últimos 10 anos.",
    ),
    sellerScreening(
      "Certidão da Justiça Federal",
      "Ações cíveis e execuções fiscais no TRF da região.",
    ),
    sellerScreening(
      "Certidão Negativa de Débitos Trabalhistas",
      "CNDT emitida no site do TST, vale para todo o país.",
    ),
    sellerScreening(
      "Certidão de ações trabalhistas",
      "Distribuição no TRT da região. Ações em andamento podem levar à penhora.",
    ),
    sellerScreening(
      "Certidão de protestos",
      `Pesquisa nacional na CENPROT pelo ${documentName} ${whose}, dos últimos 5 anos.`,
    ),
    sellerScreening(
      "Consulta de indisponibilidade de bens",
      `CNIB pelo ${documentName} ${whose}. Com ordem de indisponibilidade, o cartório não registra a venda.`,
    ),
  ];
};

const buildIndividualSeller = (): DealChecklistTemplate[] => [
  sellerDocument("RG e CPF dos vendedores", null),
  sellerDocument(
    "Certidão de estado civil dos vendedores",
    "Nascimento ou casamento atualizada, com averbação de divórcio ou óbito.",
  ),
  sellerDocument(
    "Documentos do cônjuge",
    "RG, CPF e pacto antenupcial, se houver. O cônjuge assina a venda, exceto na separação total de bens.",
  ),
  ...buildOwnerScreening({ documentName: "CPF", whose: "dos vendedores" }),
  sellerScreening(
    "Certidão de interdição e tutela",
    "Registro civil do domicílio. Confirma que o vendedor responde pelos próprios atos.",
  ),
];

/** Companies and holdings sell through who the contract says may sign. */
const buildCompanySeller = (): DealChecklistTemplate[] => [
  sellerDocument(
    "Contrato social ou estatuto consolidado",
    "Com a última alteração registrada na Junta Comercial.",
  ),
  sellerDocument(
    "Certidão simplificada da Junta Comercial",
    "Emitida há menos de 30 dias, mostra os sócios e quem administra.",
  ),
  sellerDocument(
    "Autorização dos sócios para vender",
    "Ata ou reunião de sócios, quando o contrato social exigir aprovação para vender imóveis.",
  ),
  sellerDocument(
    "Documentos de quem assina pela empresa",
    "RG e CPF do administrador, ou procuração com poderes para vender este imóvel.",
  ),
  ...buildOwnerScreening({ documentName: "CNPJ", whose: "da empresa" }),
  sellerScreening(
    "Certificado de Regularidade do FGTS",
    "CRF emitido no site da Caixa.",
  ),
  sellerScreening(
    "Certidão de falência e recuperação judicial",
    "Justiça Estadual da sede. Empresa em falência ou recuperação só vende com autorização do juiz.",
  ),
  sellerScreening(
    "Integralização registrada na matrícula",
    "Em holding, confira se o imóvel passou mesmo para o nome da empresa na matrícula, e não só no contrato social.",
  ),
  sellerScreening(
    "Varredura dos sócios",
    "Nome limpo, ações e protestos dos sócios. Dívidas deles podem alcançar o imóvel da holding pela desconsideração inversa.",
  ),
];

/** The owner passed away: the heirs sell through the probate. */
const buildEstateSeller = (): DealChecklistTemplate[] => [
  sellerDocument("Certidão de óbito", "Do proprietário que faleceu."),
  sellerDocument(
    "Autorização para vender no inventário",
    "Alvará judicial, escritura de inventário que autorize a venda, ou formal de partilha já registrado na matrícula.",
  ),
  sellerDocument(
    "Nomeação do inventariante",
    "Termo de compromisso no processo ou nomeação na escritura de inventário.",
  ),
  sellerDocument(
    "Documentos dos herdeiros e do cônjuge",
    "RG, CPF e certidão de estado civil de todos os herdeiros e do cônjuge que ficou.",
  ),
  sellerDocument(
    "Comprovante do ITCMD",
    "Imposto da herança pago, ou isenção reconhecida pela Secretaria da Fazenda.",
  ),
  ...buildOwnerScreening({
    documentName: "CPF",
    whose: "do falecido e dos herdeiros",
  }),
];

/** Seller paperwork and restriction screening for who holds the title. */
export const buildSellerTemplate = (
  sellerType: DealSellerType,
): DealChecklistTemplate[] => {
  switch (sellerType) {
    case DealSellerType.COMPANY:
      return buildCompanySeller();
    case DealSellerType.ESTATE:
      return buildEstateSeller();
    default:
      return buildIndividualSeller();
  }
};

/** The usual paperwork of a Brazilian home sale, tuned to how it is paid. */
export const buildChecklistTemplate = (
  options: DealTemplateOptions,
): DealChecklistTemplate[] => {
  const { paymentMethod, usesFgts, sellerType } = options;
  const buyer: DealChecklistTemplate[] = [
    {
      party: DealParty.BUYER,
      title: "RG e CPF ou CNH",
      description: "Frente e verso, de todos os compradores.",
      requestedFromCustomer: true,
      screening: false,
    },
    {
      party: DealParty.BUYER,
      title: "Certidão de nascimento ou casamento",
      description: "Se casado, também os documentos do cônjuge.",
      requestedFromCustomer: true,
      screening: false,
    },
    {
      party: DealParty.BUYER,
      title: "Comprovante de residência",
      description: "Conta de luz, água ou telefone dos últimos 90 dias.",
      requestedFromCustomer: true,
      screening: false,
    },
  ];

  if (usesCredit(paymentMethod)) {
    buyer.push(
      {
        party: DealParty.BUYER,
        title: "Comprovantes de renda",
        description: "Os três últimos holerites ou extratos, se autônomo.",
        requestedFromCustomer: true,
        screening: false,
      },
      {
        party: DealParty.BUYER,
        title: "Declaração do Imposto de Renda",
        description: "A última entregue, com o recibo.",
        requestedFromCustomer: true,
        screening: false,
      },
    );
  }

  if (usesFgts) {
    buyer.push({
      party: DealParty.BUYER,
      title: "Extrato do FGTS e carteira de trabalho",
      description: "Extrato atualizado pelo app do FGTS.",
      requestedFromCustomer: true,
      screening: false,
    });
  }

  const property: DealChecklistTemplate[] = [
    propertyDocument(
      "Matrícula atualizada do imóvel",
      "Inteiro teor com ônus reais e ações reipersecutórias, de menos de 30 dias. Confira penhora, hipoteca, alienação fiduciária, usufruto, inalienabilidade e indisponibilidade.",
      true,
    ),
    propertyDocument(
      "Certidão negativa de IPTU",
      "Débitos de IPTU acompanham o imóvel e passam para o comprador.",
      true,
    ),
    propertyDocument(
      "Declaração de quitação do condomínio",
      "Quando o imóvel tiver condomínio. A dívida acompanha o imóvel.",
      true,
    ),
    propertyDocument(
      "Certidão de imóvel da União",
      "Só para terreno de marinha ou foreiro: CAT da SPU com o laudêmio pago.",
      true,
    ),
    propertyDocument(
      "Habite-se e construção averbada",
      "A área construída precisa constar na matrícula, o banco também confere.",
    ),
  ];

  if (usesCredit(paymentMethod)) {
    property.push(
      propertyDocument(
        "Laudo de avaliação",
        "Feito pelo banco ou pela administradora.",
      ),
    );
  }

  return [...buyer, ...buildSellerTemplate(sellerType), ...property];
};

/** The road from the signed contract to the keys. */
export const buildMilestoneTemplate = (
  options: Pick<DealTemplateOptions, "paymentMethod">,
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
