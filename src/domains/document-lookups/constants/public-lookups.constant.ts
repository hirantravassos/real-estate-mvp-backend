import { PropertySaleDocumentCategory } from "../../properties/constants/property-sale-documents.constant";
import {
  PropertyLegalOwner,
  PropertyLegalProfile,
} from "../entities/property-legal-profile.entity";
import { taxDocumentKindOf } from "../helpers/tax-document.helper";

export type PublicLookupProfileField =
  | "city"
  | "state"
  | "registrationNumber"
  | "registryOffice"
  | "propertyTaxNumber"
  | "unionPropertyNumber";

export const publicLookupProfileFieldLabels: Record<
  PublicLookupProfileField,
  string
> = {
  city: "Cidade",
  state: "UF",
  registrationNumber: "Número da matrícula",
  registryOffice: "Cartório de registro de imóveis",
  propertyTaxNumber: "Inscrição do IPTU",
  unionPropertyNumber: "RIP da SPU",
};

export interface PublicLookupContext {
  profile: PropertyLegalProfile;
  /** Set for the certificates about one owner. */
  owner: PropertyLegalOwner | null;
}

export interface PublicLookupDefinition {
  key: string;
  /** Where the issued file lands on the sale checklist. */
  category: PropertySaleDocumentCategory;
  title: string;
  /** The public portal that issues it. */
  source: string;
  /** One certificate per owner, by CPF or CNPJ. */
  perOwner: boolean;
  /** What the broker types on the portal when issuing it by hand. */
  manualHint: string;
  /** Used to issue by hand, the portal home or a search for the right one. */
  manualUrl: (context: PublicLookupContext) => string;
  /** Fetched through Infosimples, charged in credits. Absent means only by hand. */
  automatic?: {
    path: string;
    requiredFields: PublicLookupProfileField[];
    parameters: (context: PublicLookupContext) => Record<string, string>;
  };
}

const searchUrl = (words: (string | null | undefined)[]) =>
  `https://www.google.com/search?q=${encodeURIComponent(
    words.filter(Boolean).join(" "),
  )}`;

const ownerParameters = (context: PublicLookupContext) => {
  const documentNumber = context.owner?.documentNumber ?? "";
  return { [taxDocumentKindOf(documentNumber)]: documentNumber };
};

/**
 * Certificates a broker can get from public portals for a sale. Only the ones
 * Infosimples serves for any city run on their own, the others open the
 * right portal so the broker issues them by hand and stores the file.
 *
 * To make another one automatic, add its Infosimples path and parameters.
 */
export const PUBLIC_LOOKUPS: readonly PublicLookupDefinition[] = [
  {
    key: "property_registration",
    category: "registration",
    title: "Certidão de matrícula com ônus reais",
    source: "ONR, Registro de Imóveis do Brasil",
    perOwner: false,
    manualHint:
      "Escolha o estado e o cartório, informe o número da matrícula e peça a certidão digital de inteiro teor.",
    manualUrl: () => "https://registradores.onr.org.br/",
  },
  {
    key: "property_tax_clearance",
    category: "property_tax_clearance",
    title: "Certidão negativa de débitos do IPTU",
    source: "Prefeitura do município",
    perOwner: false,
    manualHint:
      "No site da prefeitura, informe a inscrição imobiliária que está no carnê do IPTU.",
    manualUrl: ({ profile }) =>
      searchUrl([
        "certidão negativa de débitos IPTU prefeitura",
        profile.city,
        profile.state,
      ]),
  },
  {
    key: "occupancy_permit",
    category: "occupancy_permit",
    title: "Habite-se",
    source: "Prefeitura do município",
    perOwner: false,
    manualHint:
      "Peça a certidão de habite-se ou de conclusão de obra com o endereço ou a inscrição do IPTU.",
    manualUrl: ({ profile }) =>
      searchUrl([
        "certidão de habite-se prefeitura",
        profile.city,
        profile.state,
      ]),
  },
  {
    key: "laudemium_clearance",
    category: "laudemium_clearance",
    title: "Certidão de autorização para transferência (CAT)",
    source: "SPU, Secretaria do Patrimônio da União",
    perOwner: false,
    manualHint:
      "Só para terreno de marinha ou foreiro. Tenha em mãos o RIP do imóvel e o CPF do dono.",
    manualUrl: () =>
      searchUrl([
        "emitir certidão de autorização para transferência CAT SPU gov.br",
      ]),
  },
  {
    key: "owner_federal_clearance",
    category: "owner_clearances",
    title: "CND federal (Receita e PGFN)",
    source: "Receita Federal",
    perOwner: true,
    manualHint: "Informe o CPF ou CNPJ do proprietário.",
    manualUrl: () =>
      "https://servicos.receitafederal.gov.br/servico/certidoes/#/home",
    automatic: {
      path: "receita-federal/pgfn",
      requiredFields: [],
      // A valid certificate already issued is recovered when the portal refuses a new one.
      parameters: (context) => ({
        ...ownerParameters(context),
        preferencia_emissao: "2via",
      }),
    },
  },
  {
    key: "owner_labor_clearance",
    category: "owner_clearances",
    title: "CNDT, certidão negativa de débitos trabalhistas",
    source: "Tribunal Superior do Trabalho",
    perOwner: true,
    manualHint: "Informe o CPF ou CNPJ do proprietário.",
    manualUrl: () => "https://cndt-certidao.tst.jus.br/inicio.faces",
    automatic: {
      path: "tst/cndt",
      requiredFields: [],
      parameters: ownerParameters,
    },
  },
  {
    key: "owner_protest_clearance",
    category: "owner_clearances",
    title: "Certidão de protestos",
    source: "CENPROT, Central Nacional de Protesto",
    perOwner: true,
    manualHint:
      "A consulta é gratuita, a certidão oficial é paga direto aos cartórios.",
    manualUrl: () => "https://www.pesquisaprotesto.com.br/",
  },
  {
    key: "owner_civil_status",
    category: "owner_civil_status",
    title: "Certidão de nascimento ou casamento atualizada",
    source: "Registro Civil",
    perOwner: true,
    manualHint:
      "Escolha o cartório onde foi feito o registro e peça a certidão digital.",
    manualUrl: () => "https://www.registrocivil.org.br/",
  },
];

export const findPublicLookup = (key: string) =>
  PUBLIC_LOOKUPS.find((definition) => definition.key === key) ?? null;
