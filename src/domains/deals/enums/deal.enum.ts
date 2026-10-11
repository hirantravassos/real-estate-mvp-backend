/** The steps a sale walks through after the customer leaves the funnel. */
export enum DealStage {
  PROPOSAL = "proposal",
  DOCUMENTATION = "documentation",
  CONTRACT = "contract",
  CLOSING = "closing",
  COMPLETED = "completed",
}

export const DEAL_STAGE_ORDER: DealStage[] = [
  DealStage.PROPOSAL,
  DealStage.DOCUMENTATION,
  DealStage.CONTRACT,
  DealStage.CLOSING,
  DealStage.COMPLETED,
];

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  [DealStage.PROPOSAL]: "Proposta",
  [DealStage.DOCUMENTATION]: "Documentação",
  [DealStage.CONTRACT]: "Contrato e assinaturas",
  [DealStage.CLOSING]: "Pagamento e cartório",
  [DealStage.COMPLETED]: "Venda concluída",
};

export enum DealStatus {
  OPEN = "open",
  WON = "won",
  CANCELLED = "cancelled",
}

export enum DealPaymentMethod {
  CASH = "cash",
  FINANCING = "financing",
  CONSORTIUM = "consortium",
  INSTALLMENTS = "installments",
}

/** Whose paperwork a checklist item is about. */
export enum DealParty {
  BUYER = "buyer",
  SELLER = "seller",
  PROPERTY = "property",
}

/** Who holds the property title, it decides the seller paperwork. */
export enum DealSellerType {
  /** One or more people, with their spouses when married. */
  INDIVIDUAL = "individual",
  /** A company, usually a family or real estate holding. */
  COMPANY = "company",
  /** The heirs of an owner who passed away, still in probate. */
  ESTATE = "estate",
}

export const DEAL_SELLER_TYPE_LABELS: Record<DealSellerType, string> = {
  [DealSellerType.INDIVIDUAL]: "Pessoa física",
  [DealSellerType.COMPANY]: "Empresa ou holding",
  [DealSellerType.ESTATE]: "Espólio ou herdeiros",
};

export enum DealChecklistStatus {
  PENDING = "pending",
  SUBMITTED = "submitted",
  APPROVED = "approved",
  REJECTED = "rejected",
  /** A certificate came back positive: something blocks the sale for now. */
  RESTRICTED = "restricted",
}

export enum DealSignerRole {
  BUYER = "buyer",
  SELLER = "seller",
  BROKER = "broker",
  WITNESS = "witness",
  /** A partner broker who shares the sale and the commission. */
  PARTNER = "partner",
}

export enum DealSignerStatus {
  PENDING = "pending",
  /** Sent a copy signed elsewhere (gov.br), waiting for the broker to check. */
  SUBMITTED = "submitted",
  SIGNED = "signed",
}

export enum DealSignatureMethod {
  /** Accepted on our signing page, with the evidence trail stored. */
  ELECTRONIC = "electronic",
  /** Signed on assinador.iti.br and uploaded back. */
  GOVBR = "govbr",
  /** Signed on paper, marked by the broker. */
  MANUAL = "manual",
}

export enum DealEventActor {
  BROKER = "broker",
  CUSTOMER = "customer",
  PARTNER = "partner",
  SYSTEM = "system",
}

export enum DealEventKind {
  CREATED = "created",
  STAGE = "stage",
  PROPOSAL = "proposal",
  DOCUMENT = "document",
  CONTRACT = "contract",
  SIGNATURE = "signature",
  MILESTONE = "milestone",
  MESSAGE = "message",
  PARTNER = "partner",
  WON = "won",
  CANCELLED = "cancelled",
}
