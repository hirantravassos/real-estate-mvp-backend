import { ConflictException } from "@nestjs/common";
import { Repository } from "typeorm";
import { DocumentService } from "../../documents/services/document.service";
import { Deal } from "../entities/deal.entity";
import { DealSigner } from "../entities/deal-signer.entity";
import {
  DealSignerRole,
  DealSignerStatus,
  DealStatus,
} from "../enums/deal.enum";
import { DealActivityService } from "./deal-activity.service";
import { DealSignatureService } from "./deal-signature.service";
import { DealService } from "./deal.service";

const CONTRACT_SHA256 = "a".repeat(64);

const buildService = (affected = 1) => {
  const signer = {
    id: "signer-1",
    name: "Ana Souza",
    role: DealSignerRole.BUYER,
    status: DealSignerStatus.PENDING,
    deal: {
      id: "deal-1",
      userId: "broker-1",
      status: DealStatus.OPEN,
      contractDocumentId: "document-1",
      contractSha256: CONTRACT_SHA256,
    },
  } as unknown as DealSigner;
  const update = jest.fn().mockResolvedValue({ affected });
  const signerRepository = {
    findOne: jest.fn().mockResolvedValue(signer),
    update,
  } as unknown as Repository<DealSigner>;
  const service = new DealSignatureService(
    signerRepository,
    {} as Repository<Deal>,
    {} as DocumentService,
    {} as DealService,
    {} as DealActivityService,
  );
  return { service, update };
};

const signing = (contractSha256: string) => ({
  fullName: "Ana Souza",
  documentNumber: "12345678909",
  contractSha256,
  accepted: true,
});

const evidence = { ip: "203.0.113.7", userAgent: "test" };

describe("DealSignatureService.signElectronically", () => {
  it("refuses a signature of a contract version that is no longer in force", async () => {
    const { service, update } = buildService();
    await expect(
      service.signElectronically("token", signing("b".repeat(64)), evidence),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(update).not.toHaveBeenCalled();
  });

  it("writes only over a pending signature, never over an existing one", async () => {
    const { service, update } = buildService(0);
    await expect(
      service.signElectronically("token", signing(CONTRACT_SHA256), evidence),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(update).toHaveBeenCalledWith(
      { id: "signer-1", status: DealSignerStatus.PENDING },
      expect.objectContaining({
        status: DealSignerStatus.SIGNED,
        signedContractSha256: CONTRACT_SHA256,
      }),
    );
  });
});
