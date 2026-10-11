import { Document } from "../../documents/entities/document.entity";
import { DocumentMapper } from "../../documents/mappers/document.mapper";
import { Property } from "../../properties/entities/property.entity";
import { PropertyKindEnum } from "../../properties/mappers/property.mapper";
import { Deal } from "../entities/deal.entity";
import { DealChecklistItem } from "../entities/deal-checklist-item.entity";
import { DealSigner } from "../entities/deal-signer.entity";
import { DealMilestone } from "../entities/deal-milestone.entity";
import { DealEvent } from "../entities/deal-event.entity";
import { DealPartner } from "../entities/deal-partner.entity";
import {
  DealChecklistStatus,
  DealSignerRole,
  DealSignerStatus,
} from "../enums/deal.enum";

export interface DealProgressDto {
  checklistTotal: number;
  checklistApproved: number;
  checklistWaitingReview: number;
  signersTotal: number;
  signersSigned: number;
  milestonesTotal: number;
  milestonesCompleted: number;
}

export interface DealPropertySummaryDto {
  id: string;
  kind: PropertyKindEnum | null;
  alias: string | null;
  address: string;
  address2: string;
  price: string;
}

export interface DealDocumentsDto {
  byItem: Map<string, Document[]>;
  byId: Map<string, Document>;
}

const byOrder = <T extends { sortOrder: number; createdAt: Date }>(
  first: T,
  second: T,
) =>
  first.sortOrder - second.sortOrder ||
  first.createdAt.getTime() - second.createdAt.getTime();

const byCreation = (first: DealSigner, second: DealSigner) =>
  first.createdAt.getTime() - second.createdAt.getTime();

const byPartnerCreation = (first: DealPartner, second: DealPartner) =>
  first.createdAt.getTime() - second.createdAt.getTime();

const byNewest = (first: DealEvent, second: DealEvent) =>
  second.createdAt.getTime() - first.createdAt.getTime();

const toNumberOrNull = (value: string | null) =>
  value === null || value === undefined ? null : Number(value);

/** "Maria Souza" becomes "Maria S.", so other signers are not exposed. */
const shortName = (name: string) => {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first;
};

const activePartners = (deal: Deal) =>
  (deal.partners ?? [])
    .filter((partner) => partner.active)
    .sort(byPartnerCreation);

/** Value of a commission share, when the sale numbers are known. */
const commissionAmountOf = (deal: Deal, share: string | null) => {
  if (!deal.offerAmount || deal.commissionPercentage === null || !share) {
    return null;
  }
  const total =
    (Number(deal.offerAmount) * Number(deal.commissionPercentage)) / 100;
  return Math.round(total * Number(share)) / 100;
};

export class DealMapper {
  static toProgress(deal: Deal): DealProgressDto {
    const checklist = (deal.checklistItems ?? []).filter((item) => item.active);
    const signers = (deal.signers ?? []).filter((signer) => signer.active);
    const milestones = (deal.milestones ?? []).filter(
      (milestone) => milestone.active,
    );

    return {
      checklistTotal: checklist.length,
      checklistApproved: checklist.filter(
        (item) => item.status === DealChecklistStatus.APPROVED,
      ).length,
      checklistWaitingReview: checklist.filter(
        (item) => item.status === DealChecklistStatus.SUBMITTED,
      ).length,
      signersTotal: signers.length,
      signersSigned: signers.filter(
        (signer) => signer.status === DealSignerStatus.SIGNED,
      ).length,
      milestonesTotal: milestones.length,
      milestonesCompleted: milestones.filter((milestone) =>
        Boolean(milestone.completedAt),
      ).length,
    };
  }

  static toProperty(property: Property | null): DealPropertySummaryDto | null {
    if (!property) return null;
    return {
      id: property.id,
      kind: property.kind ?? null,
      alias: property.alias,
      address: property.address,
      address2: property.address2,
      price: property.price,
    };
  }

  static toCustomer(deal: Deal) {
    if (!deal.customer) return null;
    return {
      id: deal.customer.id,
      name: deal.customer.name,
      phone: deal.customer.phone,
      avatar: deal.customer.avatar ?? null,
    };
  }

  static toListDto(deal: Deal) {
    return {
      id: deal.id,
      stage: deal.stage,
      status: deal.status,
      offerAmount: deal.offerAmount,
      paymentMethod: deal.paymentMethod,
      commissionPercentage: toNumberOrNull(deal.commissionPercentage),
      /** Sum of what the partners take, from 0 to 100 of the commission. */
      partnersCommissionShare: activePartners(deal).reduce(
        (total, partner) => total + Number(partner.commissionShare ?? 0),
        0,
      ),
      customer: this.toCustomer(deal),
      property: this.toProperty(deal.property),
      progress: this.toProgress(deal),
      closedAt: deal.closedAt,
      createdAt: deal.createdAt,
      updatedAt: deal.updatedAt,
    };
  }

  static toDto(deal: Deal, documents: DealDocumentsDto) {
    const contractDocument = deal.contractDocumentId
      ? (documents.byId.get(deal.contractDocumentId) ?? null)
      : null;

    return {
      ...this.toListDto(deal),
      downPaymentAmount: deal.downPaymentAmount,
      usesFgts: deal.usesFgts,
      notes: deal.notes,
      portalToken: deal.portalToken,
      portalEnabled: deal.portalEnabled,
      cancellationReason: deal.cancellationReason,
      contract: contractDocument
        ? {
            document: DocumentMapper.toDto(contractDocument),
            sha256: deal.contractSha256,
            uploadedAt: deal.contractUploadedAt,
          }
        : null,
      checklist: (deal.checklistItems ?? [])
        .filter((item) => item.active)
        .sort(byOrder)
        .map((item) => this.toChecklistItem(item, documents)),
      signers: (deal.signers ?? [])
        .filter((signer) => signer.active)
        .sort(byCreation)
        .map((signer) => this.toSigner(signer, documents)),
      milestones: (deal.milestones ?? [])
        .filter((milestone) => milestone.active)
        .sort(byOrder)
        .map((milestone) => this.toMilestone(milestone)),
      partners: activePartners(deal).map((partner) =>
        this.toPartner(partner, deal),
      ),
      events: (deal.events ?? [])
        .sort(byNewest)
        .map((event) => this.toEvent(event)),
    };
  }

  static toPartner(partner: DealPartner, deal: Deal) {
    const signer = (deal.signers ?? []).find(
      (item) => item.active && item.partnerId === partner.id,
    );
    return {
      id: partner.id,
      customerId: partner.customerId,
      name: partner.name,
      phone: partner.phone,
      email: partner.email,
      creci: partner.creci,
      commissionShare: toNumberOrNull(partner.commissionShare),
      accessToken: partner.accessToken,
      signer: signer
        ? { id: signer.id, status: signer.status, signedAt: signer.signedAt }
        : null,
      createdAt: partner.createdAt,
    };
  }

  static toChecklistItem(item: DealChecklistItem, documents: DealDocumentsDto) {
    return {
      id: item.id,
      party: item.party,
      title: item.title,
      description: item.description,
      status: item.status,
      rejectionReason: item.rejectionReason,
      requestedFromCustomer: item.requestedFromCustomer,
      submittedAt: item.submittedAt,
      reviewedAt: item.reviewedAt,
      documents: (documents.byItem.get(item.id) ?? []).map((document) =>
        DocumentMapper.toDto(document),
      ),
    };
  }

  static toSigner(signer: DealSigner, documents: DealDocumentsDto) {
    const signedDocument = signer.signedDocumentId
      ? documents.byId.get(signer.signedDocumentId)
      : null;

    return {
      id: signer.id,
      name: signer.name,
      email: signer.email,
      phone: signer.phone,
      role: signer.role,
      status: signer.status,
      method: signer.method,
      signingToken: signer.signingToken,
      signedAt: signer.signedAt,
      signedName: signer.signedName,
      signedDocumentNumber: signer.signedDocumentNumber,
      signedIp: signer.signedIp,
      signedContractSha256: signer.signedContractSha256,
      signedDocument: signedDocument
        ? DocumentMapper.toDto(signedDocument)
        : null,
    };
  }

  static toMilestone(milestone: DealMilestone) {
    return {
      id: milestone.id,
      title: milestone.title,
      dueDate: milestone.dueDate,
      completedAt: milestone.completedAt,
    };
  }

  static toEvent(event: DealEvent) {
    return {
      id: event.id,
      kind: event.kind,
      actor: event.actor,
      message: event.message,
      visibleToCustomer: event.visibleToCustomer,
      createdAt: event.createdAt,
    };
  }

  /**
   * What a partner broker sees: the whole paperwork and contract, their own
   * commission share, never the broker's notes or the other partners' shares.
   */
  static toPartnerAreaDto(
    deal: Deal,
    partner: DealPartner,
    documents: DealDocumentsDto,
  ) {
    const contractDocument = deal.contractDocumentId
      ? (documents.byId.get(deal.contractDocumentId) ?? null)
      : null;

    return {
      stage: deal.stage,
      status: deal.status,
      offerAmount: deal.offerAmount,
      downPaymentAmount: deal.downPaymentAmount,
      paymentMethod: deal.paymentMethod,
      usesFgts: deal.usesFgts,
      partner: {
        name: partner.name,
        commissionShare: toNumberOrNull(partner.commissionShare),
        commissionAmount: commissionAmountOf(deal, partner.commissionShare),
      },
      customer: { name: shortName(deal.customer.name) },
      broker: {
        name: deal.user.name,
        profileImage: deal.user.profileImage,
        avatar: deal.user.avatar ?? null,
      },
      property: this.toProperty(deal.property),
      progress: this.toProgress(deal),
      checklist: (deal.checklistItems ?? [])
        .filter((item) => item.active)
        .sort(byOrder)
        .map((item) => this.toChecklistItem(item, documents)),
      contract: contractDocument
        ? {
            document: DocumentMapper.toDto(contractDocument),
            sha256: deal.contractSha256,
            uploadedAt: deal.contractUploadedAt,
          }
        : null,
      signers: (deal.signers ?? [])
        .filter((signer) => signer.active)
        .sort(byCreation)
        .map((signer) => ({
          id: signer.id,
          name: shortName(signer.name),
          role: signer.role,
          status: signer.status,
          signedAt: signer.signedAt,
          // Partners only get their own signing link.
          signingToken:
            signer.partnerId === partner.id ? signer.signingToken : null,
        })),
      milestones: (deal.milestones ?? [])
        .filter((milestone) => milestone.active)
        .sort(byOrder)
        .map((milestone) => this.toMilestone(milestone)),
      events: (deal.events ?? [])
        .filter((event) => event.visibleToCustomer)
        .sort(byNewest)
        .slice(0, 30)
        .map((event) => ({
          id: event.id,
          kind: event.kind,
          actor: event.actor,
          message: event.message,
          createdAt: event.createdAt,
        })),
      closedAt: deal.closedAt,
    };
  }

  /** What the customer sees: no notes, no commission, no other people's data. */
  static toPortalDto(
    deal: Deal,
    documents: DealDocumentsDto,
    coverUrl: string | null,
  ) {
    const contractDocument = deal.contractDocumentId
      ? (documents.byId.get(deal.contractDocumentId) ?? null)
      : null;

    return {
      stage: deal.stage,
      status: deal.status,
      offerAmount: deal.offerAmount,
      downPaymentAmount: deal.downPaymentAmount,
      paymentMethod: deal.paymentMethod,
      usesFgts: deal.usesFgts,
      customer: { firstName: deal.customer.name.trim().split(/\s+/)[0] },
      broker: {
        name: deal.user.name,
        profileImage: deal.user.profileImage,
        avatar: deal.user.avatar ?? null,
      },
      property: deal.property
        ? { ...this.toProperty(deal.property), coverUrl }
        : null,
      progress: this.toProgress(deal),
      checklist: (deal.checklistItems ?? [])
        .filter((item) => item.active && item.requestedFromCustomer)
        .sort(byOrder)
        .map((item) => this.toChecklistItem(item, documents)),
      contract: contractDocument
        ? {
            document: DocumentMapper.toDto(contractDocument),
            sha256: deal.contractSha256,
            uploadedAt: deal.contractUploadedAt,
          }
        : null,
      signers: (deal.signers ?? [])
        .filter((signer) => signer.active)
        .sort(byCreation)
        .map((signer) => ({
          id: signer.id,
          name: shortName(signer.name),
          role: signer.role,
          status: signer.status,
          signedAt: signer.signedAt,
          // Only buyers sign from the customer area, everyone else gets their own link.
          signingToken:
            signer.role === DealSignerRole.BUYER ? signer.signingToken : null,
        })),
      milestones: (deal.milestones ?? [])
        .filter((milestone) => milestone.active)
        .sort(byOrder)
        .map((milestone) => this.toMilestone(milestone)),
      events: (deal.events ?? [])
        .filter((event) => event.visibleToCustomer)
        .sort(byNewest)
        .slice(0, 30)
        .map((event) => ({
          id: event.id,
          kind: event.kind,
          actor: event.actor,
          message: event.message,
          createdAt: event.createdAt,
        })),
      closedAt: deal.closedAt,
    };
  }
}
