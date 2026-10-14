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
import { DealParticipant } from "../entities/deal-participant.entity";
import {
  DealChecklistStatus,
  DealParticipantRole,
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

/** How far the restriction screening of the seller and the property is. */
export interface DealScreeningDto {
  total: number;
  /** Came back clean, or the restriction was solved. */
  cleared: number;
  /** Positive results that block the sale until solved. */
  restricted: number;
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

const activeParticipants = (deal: Deal) =>
  (deal.participants ?? [])
    .filter((participant) => participant.active)
    .sort(byOrder);

/** Whose paper it is, by name, when it belongs to one buyer or seller. */
const participantNameOf = (
  item: DealChecklistItem,
  participants: Map<string, DealParticipant>,
  roles: DealParticipantRole[],
) => {
  const participant = item.participantId
    ? participants.get(item.participantId)
    : null;
  return participant && roles.includes(participant.role)
    ? participant.name
    : null;
};

const ALL_ROLES = [DealParticipantRole.BUYER, DealParticipantRole.SELLER];

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

  static toScreening(deal: Deal): DealScreeningDto {
    const screening = (deal.checklistItems ?? []).filter(
      (item) => item.active && item.screening,
    );
    return {
      total: screening.length,
      cleared: screening.filter(
        (item) => item.status === DealChecklistStatus.APPROVED,
      ).length,
      restricted: screening.filter(
        (item) => item.status === DealChecklistStatus.RESTRICTED,
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
      screening: this.toScreening(deal),
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
      sellerType: deal.sellerType,
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
      participants: activeParticipants(deal).map((participant) =>
        this.toParticipant(participant),
      ),
      checklist: this.toChecklist(deal, documents, ALL_ROLES).map((item) => ({
        ...item,
        documents: item.documents.map((document) => ({
          ...document,
          uploadedByPartnerId:
            documents.byId.get(document.id)?.uploadedByPartnerId ?? null,
        })),
      })),
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
      accessSentAt: partner.accessSentAt ?? null,
      signer: signer
        ? { id: signer.id, status: signer.status, signedAt: signer.signedAt }
        : null,
      createdAt: partner.createdAt,
    };
  }

  static toParticipant(participant: DealParticipant) {
    return {
      id: participant.id,
      role: participant.role,
      name: participant.name,
      customerId: participant.customerId,
      customer: participant.customer
        ? {
            id: participant.customer.id,
            name: participant.customer.name,
            phone: participant.customer.phone,
          }
        : null,
    };
  }

  /**
   * The active papers in order. Names of the people they belong to only go
   * out for the roles given, so a buyer never reads the seller's name.
   */
  static toChecklist(
    deal: Deal,
    documents: DealDocumentsDto,
    namedRoles: DealParticipantRole[],
    filter: (item: DealChecklistItem) => boolean = () => true,
  ) {
    const participants = new Map(
      activeParticipants(deal).map((participant) => [
        participant.id,
        participant,
      ]),
    );
    return (deal.checklistItems ?? [])
      .filter((item) => item.active && filter(item))
      .sort(byOrder)
      .map((item) => ({
        ...this.toChecklistItem(item, documents),
        participantName: participantNameOf(item, participants, namedRoles),
      }));
  }

  static toChecklistItem(item: DealChecklistItem, documents: DealDocumentsDto) {
    return {
      id: item.id,
      party: item.party,
      participantId: item.participantId ?? null,
      title: item.title,
      description: item.description,
      status: item.status,
      rejectionReason: item.rejectionReason,
      requestedFromCustomer: item.requestedFromCustomer,
      screening: item.screening,
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
        phone: deal.user.phone ?? null,
        profileImage: deal.user.profileImage,
        avatar: deal.user.avatar ?? null,
      },
      property: this.toProperty(deal.property),
      progress: this.toProgress(deal),
      people: activeParticipants(deal).map((participant) => ({
        id: participant.id,
        role: participant.role,
        name: participant.name,
      })),
      checklist: this.toChecklist(deal, documents, ALL_ROLES).map((item) => ({
        ...item,
        // A partner learns only whether a file is theirs, never which
        // other partner sent it.
        documents: item.documents.map((document) => {
          const sender =
            documents.byId.get(document.id)?.uploadedByPartnerId ?? null;
          return {
            ...document,
            mine: sender === partner.id,
            sentBy:
              sender === partner.id
                ? "you"
                : sender
                  ? "another_partner"
                  : "broker_or_customer",
          };
        }),
      })),
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
      customer: {
        firstName: deal.customer.name.trim().split(/\s+/)[0],
        name: deal.customer.name,
        avatar: deal.customer.avatar ?? null,
      },
      broker: {
        name: deal.user.name,
        profileImage: deal.user.profileImage,
        avatar: deal.user.avatar ?? null,
      },
      property: deal.property
        ? { ...this.toProperty(deal.property), coverUrl }
        : null,
      progress: this.toProgress(deal),
      checklist: this.toChecklist(
        deal,
        documents,
        [DealParticipantRole.BUYER],
        (item) => item.requestedFromCustomer,
      ).map((item) => ({
        ...item,
        // The shared customer area never says which seller a paper is from.
        participantId:
          item.participantName === null ? null : item.participantId,
      })),
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
          // The customer area is shared by every buyer, so it never carries a
          // signing link: each signer gets their own from the broker, and one
          // buyer can never sign in the name of another.
          signingToken: null,
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
