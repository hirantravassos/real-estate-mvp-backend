import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  UnauthorizedException,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { Repository } from "typeorm";
import { authConfig } from "../../../config/auth.config";
import { DocumentOwnerType } from "../../documents/entities/document.entity";
import { DocumentService } from "../../documents/services/document.service";
import { DealChecklistItem } from "../entities/deal-checklist-item.entity";
import { DealParticipant } from "../entities/deal-participant.entity";
import { DealPartner } from "../entities/deal-partner.entity";
import { DealChecklistStatus, DealStatus } from "../enums/deal.enum";
import { DealActivityService } from "./deal-activity.service";
import { DealPartnerAreaService } from "./deal-partner-area.service";
import { DealService } from "./deal.service";

const buildService = (
  itemStatus = DealChecklistStatus.SUBMITTED,
  partnerOverrides: Partial<DealPartner> = {},
) => {
  const partner = {
    id: "partner-1",
    dealId: "deal-1",
    name: "Paula Parceira",
    phone: "11987654321",
    accessToken: "link-1",
    failedVerifications: 0,
    verificationLockedUntil: null,
    ...partnerOverrides,
  } as DealPartner;
  const deal = {
    id: "deal-1",
    userId: "broker-1",
    status: DealStatus.OPEN,
    checklistItems: [],
    user: { name: "Bruno Corretor" },
    customer: { name: "Ana Compradora" },
    property: null,
  };
  const documents: Record<string, object> = {
    "own-file": {
      id: "own-file",
      ownerType: DocumentOwnerType.DEAL_ITEM,
      ownerId: "item-1",
      uploadedByPartnerId: "partner-1",
    },
    "other-partner-file": {
      id: "other-partner-file",
      ownerType: DocumentOwnerType.DEAL_ITEM,
      ownerId: "item-1",
      uploadedByPartnerId: "partner-2",
    },
    "broker-file": {
      id: "broker-file",
      ownerType: DocumentOwnerType.DEAL_ITEM,
      ownerId: "item-1",
      uploadedByPartnerId: null,
    },
  };
  const updatePartner = jest.fn();
  const partnerRepository = {
    findOne: jest.fn().mockResolvedValue(partner),
    update: updatePartner,
  } as unknown as Repository<DealPartner>;
  const updateItem = jest.fn();
  const checklistRepository = {
    findOne: jest.fn().mockResolvedValue({
      id: "item-1",
      dealId: "deal-1",
      title: "Matrícula",
      status: itemStatus,
    }),
    update: updateItem,
  } as unknown as Repository<DealChecklistItem>;
  const removeDocument = jest.fn();
  const documentService = {
    remove: removeDocument,
    findAllByOwner: jest.fn().mockResolvedValue([]),
  } as unknown as DocumentService;
  const dealService = {
    findDetailedOrThrow: jest.fn().mockResolvedValue(deal),
    findDealDocumentOrThrow: jest.fn(
      (_deal: unknown, documentId: string) => documents[documentId],
    ),
    loadDocuments: jest
      .fn()
      .mockResolvedValue({ byItem: new Map(), byId: new Map() }),
  } as unknown as DealService;
  const service = new DealPartnerAreaService(
    { jwtSecret: "a".repeat(64) } as ConfigType<typeof authConfig>,
    partnerRepository,
    checklistRepository,
    {} as Repository<DealParticipant>,
    dealService,
    documentService,
    {
      record: jest.fn(),
      notifyBroker: jest.fn(),
    } as unknown as DealActivityService,
  );
  return { service, removeDocument, updateItem, updatePartner };
};

const sessionFor = async (service: DealPartnerAreaService) =>
  (await service.verify("link-1", "+55 (11) 98765-4321")).sessionToken;

describe("DealPartnerAreaService", () => {
  it("opens only with the number the broker saved, typed any way", async () => {
    const { service } = buildService();
    await expect(
      service.verify("link-1", "11 90000-0000"),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(sessionFor(service)).resolves.toMatch(/^\d+\./);
  });

  it("locks the area after five wrong numbers", async () => {
    const { service, updatePartner } = buildService(
      DealChecklistStatus.SUBMITTED,
      { failedVerifications: 4 },
    );
    await expect(
      service.verify("link-1", "11900000000"),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(updatePartner).toHaveBeenCalledWith(
      { id: "partner-1" },
      expect.objectContaining({
        failedVerifications: 0,
        verificationLockedUntil: expect.any(Date) as Date,
      }),
    );

    const locked = buildService(DealChecklistStatus.SUBMITTED, {
      verificationLockedUntil: new Date(Date.now() + 60_000),
    });
    await expect(
      locked.service.verify("link-1", "11987654321"),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it("refuses the area without a session or with a tampered one", async () => {
    const { service } = buildService();
    await expect(service.getArea("link-1", undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    const session = await sessionFor(service);
    await expect(
      service.getArea("link-1", `${session}x`),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("removes the partner's own file and reopens an emptied paper", async () => {
    const { service, removeDocument, updateItem } = buildService();
    const session = await sessionFor(service);
    await service.removeDocument("link-1", session, "own-file");
    expect(removeDocument).toHaveBeenCalledWith("broker-1", "own-file");
    expect(updateItem).toHaveBeenCalledWith(
      { id: "item-1", dealId: "deal-1" },
      { status: DealChecklistStatus.PENDING, submittedAt: null },
    );
  });

  it("never removes a file of the broker or of another partner", async () => {
    const { service, removeDocument } = buildService();
    const session = await sessionFor(service);
    for (const documentId of ["other-partner-file", "broker-file"]) {
      await expect(
        service.removeDocument("link-1", session, documentId),
      ).rejects.toBeInstanceOf(ForbiddenException);
    }
    expect(removeDocument).not.toHaveBeenCalled();
  });

  it("never removes a file of a paper the broker approved", async () => {
    const { service, removeDocument } = buildService(
      DealChecklistStatus.APPROVED,
    );
    const session = await sessionFor(service);
    await expect(
      service.removeDocument("link-1", session, "own-file"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(removeDocument).not.toHaveBeenCalled();
  });
});
