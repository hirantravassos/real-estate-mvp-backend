import { Proposal, ProposalCommissionType, ProposalStatus } from "../entities/proposal.entity";
import { ProposalParty, ProposalPartyKind, ProposalPartyRole } from "../entities/proposal-party.entity";
import { ProposalDocument, ProposalDocumentCategory } from "../entities/proposal-document.entity";

export interface ProposalPartyDto {
  id: string;
  role: ProposalPartyRole;
  kind: ProposalPartyKind;
  name: string;
  cpfCnpj: string;
  cpfCnpjMasked: string;
  email: string | null;
  phone: string | null;
  partyOrder: number;
}

export interface ProposalDocumentDto {
  id: string;
  proposalId: string;
  partyId: string | null;
  category: ProposalDocumentCategory;
  displayName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
}

export interface ProposalDto {
  id: string;
  userId: string;
  propertyId: string | null;
  property: { id: string; alias: string | null; address: string; address2: string } | null;
  title: string;
  salePrice: string;
  commissionType: ProposalCommissionType;
  commissionValue: string;
  status: ProposalStatus;
  publicToken: string;
  notes: string | null;
  parties: ProposalPartyDto[];
  documents: ProposalDocumentDto[];
  createdAt: Date;
  updatedAt: Date;
  active: boolean;
}

export interface ProposalListDto {
  id: string;
  title: string;
  salePrice: string;
  commissionType: ProposalCommissionType;
  commissionValue: string;
  status: ProposalStatus;
  propertyId: string | null;
  property: { alias: string | null; address: string } | null;
  buyersCount: number;
  sellersCount: number;
  documentsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProposalPublicPartyDto {
  id: string;
  role: ProposalPartyRole;
  kind: ProposalPartyKind;
  name: string;
  cpfCnpjMasked: string;
  partyOrder: number;
}

export interface ProposalPublicDto {
  id: string;
  title: string;
  salePrice: string;
  commissionType: ProposalCommissionType;
  commissionValue: string;
  status: ProposalStatus;
  notes: string | null;
  property: { alias: string | null; address: string; address2: string } | null;
  parties: ProposalPublicPartyDto[];
  documents: ProposalDocumentDto[];
  currentPartyId: string;
  currentPartyRole: ProposalPartyRole;
  createdAt: Date;
  updatedAt: Date;
}

function maskDocument(value: string): string {
  if (value.length === 11) {
    return `***.***.${value.slice(6, 9)}-**`;
  }
  if (value.length === 14) {
    return `**.${value.slice(2, 5)}.${value.slice(5, 8)}/****-**`;
  }
  return "***";
}

export class ProposalMapper {
  static toPartyDto(party: ProposalParty): ProposalPartyDto {
    return {
      id: party.id,
      role: party.role,
      kind: party.kind,
      name: party.name,
      cpfCnpj: party.cpfCnpj,
      cpfCnpjMasked: maskDocument(party.cpfCnpj),
      email: party.email,
      phone: party.phone,
      partyOrder: party.partyOrder,
    };
  }

  static toDocumentDto(doc: ProposalDocument): ProposalDocumentDto {
    return {
      id: doc.id,
      proposalId: doc.proposalId,
      partyId: doc.partyId,
      category: doc.category,
      displayName: doc.displayName,
      mimeType: doc.mimeType,
      sizeBytes: Number(doc.sizeBytes),
      createdAt: doc.createdAt,
    };
  }

  static toDto(proposal: Proposal): ProposalDto {
    return {
      id: proposal.id,
      userId: proposal.userId,
      propertyId: proposal.propertyId,
      property: proposal.property
        ? {
            id: proposal.property.id,
            alias: proposal.property.alias,
            address: proposal.property.address,
            address2: proposal.property.address2,
          }
        : null,
      title: proposal.title,
      salePrice: proposal.salePrice,
      commissionType: proposal.commissionType,
      commissionValue: proposal.commissionValue,
      status: proposal.status,
      publicToken: proposal.publicToken,
      notes: proposal.notes,
      parties: (proposal.parties ?? []).map(this.toPartyDto),
      documents: (proposal.documents ?? []).map(this.toDocumentDto),
      createdAt: proposal.createdAt,
      updatedAt: proposal.updatedAt,
      active: proposal.active,
    };
  }

  static toListDto(proposal: Proposal): ProposalListDto {
    const parties = proposal.parties ?? [];
    const documents = proposal.documents ?? [];
    return {
      id: proposal.id,
      title: proposal.title,
      salePrice: proposal.salePrice,
      commissionType: proposal.commissionType,
      commissionValue: proposal.commissionValue,
      status: proposal.status,
      propertyId: proposal.propertyId,
      property: proposal.property
        ? { alias: proposal.property.alias, address: proposal.property.address }
        : null,
      buyersCount: parties.filter((p) => p.role === ProposalPartyRole.BUYER).length,
      sellersCount: parties.filter((p) => p.role === ProposalPartyRole.SELLER).length,
      documentsCount: documents.length,
      createdAt: proposal.createdAt,
      updatedAt: proposal.updatedAt,
    };
  }

  static toPublicDto(proposal: Proposal, matchedParty: ProposalParty): ProposalPublicDto {
    return {
      id: proposal.id,
      title: proposal.title,
      salePrice: proposal.salePrice,
      commissionType: proposal.commissionType,
      commissionValue: proposal.commissionValue,
      status: proposal.status,
      notes: proposal.notes,
      property: proposal.property
        ? {
            alias: proposal.property.alias,
            address: proposal.property.address,
            address2: proposal.property.address2,
          }
        : null,
      parties: (proposal.parties ?? []).map((p) => ({
        id: p.id,
        role: p.role,
        kind: p.kind,
        name: p.name,
        cpfCnpjMasked: maskDocument(p.cpfCnpj),
        partyOrder: p.partyOrder,
      })),
      documents: (proposal.documents ?? []).map(this.toDocumentDto),
      currentPartyId: matchedParty.id,
      currentPartyRole: matchedParty.role,
      createdAt: proposal.createdAt,
      updatedAt: proposal.updatedAt,
    };
  }
}
