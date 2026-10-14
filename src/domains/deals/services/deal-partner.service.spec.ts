import { BadRequestException, NotFoundException } from "@nestjs/common";
import { DataSource, EntityManager, Repository } from "typeorm";
import { Customer } from "../../customers/entities/customer.entity";
import { DocumentService } from "../../documents/services/document.service";
import { User } from "../../users/entities/user.entity";
import { Deal } from "../entities/deal.entity";
import { DealChecklistItem } from "../entities/deal-checklist-item.entity";
import { DealPartner } from "../entities/deal-partner.entity";
import { DealSigner } from "../entities/deal-signer.entity";
import { DealStatus } from "../enums/deal.enum";
import { DealActivityService } from "./deal-activity.service";
import { DealPartnerService } from "./deal-partner.service";
import { DealService } from "./deal.service";

const owner = { id: "broker-1" } as User;
const intruder = { id: "broker-2" } as User;

const buildService = () => {
  const deal = { id: "deal-1", userId: owner.id, status: DealStatus.OPEN };
  const partners = [
    { id: "partner-1", dealId: "deal-1", commissionShare: "50.00" },
    { id: "partner-2", dealId: "deal-1", commissionShare: "50.00" },
  ];
  const managerUpdate = jest.fn().mockResolvedValue({ affected: 1 });
  const dataSource = {
    transaction: (work: (manager: EntityManager) => Promise<unknown>) =>
      work({ update: managerUpdate } as unknown as EntityManager),
  } as unknown as DataSource;
  const dealRepository = {
    findOne: jest.fn(({ where }: { where: { id: string; userId: string } }) =>
      Promise.resolve(
        where.id === deal.id && where.userId === deal.userId ? deal : null,
      ),
    ),
  } as unknown as Repository<Deal>;
  const partnerRepository = {
    find: jest.fn().mockResolvedValue(partners),
  } as unknown as Repository<DealPartner>;
  const dealService = {
    assertOpen: jest.fn(),
    findOne: jest.fn().mockResolvedValue({ id: deal.id }),
  } as unknown as DealService;
  const service = new DealPartnerService(
    dataSource,
    partnerRepository,
    {} as Repository<DealSigner>,
    {} as Repository<DealChecklistItem>,
    dealRepository,
    {} as Repository<Customer>,
    dealService,
    {} as DocumentService,
    { record: jest.fn() } as unknown as DealActivityService,
  );
  return { service, managerUpdate };
};

describe("DealPartnerService.splitCommission", () => {
  it("moves points between partners in one go, like 50/50 to 30/30", async () => {
    const { service, managerUpdate } = buildService();
    await service.splitCommission(owner, "deal-1", {
      commissionPercentage: 6,
      partners: [
        { partnerId: "partner-1", commissionShare: 30 },
        { partnerId: "partner-2", commissionShare: 30 },
      ],
    });
    expect(managerUpdate).toHaveBeenCalledWith(
      Deal,
      { id: "deal-1", userId: owner.id },
      { commissionPercentage: "6" },
    );
    expect(managerUpdate).toHaveBeenCalledWith(
      DealPartner,
      { id: "partner-1", dealId: "deal-1", active: true },
      { commissionShare: "30" },
    );
  });

  it("refuses partners that take more than the whole commission", async () => {
    const { service, managerUpdate } = buildService();
    await expect(
      service.splitCommission(owner, "deal-1", {
        partners: [{ partnerId: "partner-1", commissionShare: 60 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(managerUpdate).not.toHaveBeenCalled();
  });

  it("never changes another broker's sale", async () => {
    const { service, managerUpdate } = buildService();
    await expect(
      service.splitCommission(intruder, "deal-1", {
        commissionPercentage: 1,
        partners: [{ partnerId: "partner-1", commissionShare: 0 }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(managerUpdate).not.toHaveBeenCalled();
  });

  it("never touches a partner of another sale", async () => {
    const { service, managerUpdate } = buildService();
    await expect(
      service.splitCommission(owner, "deal-1", {
        partners: [{ partnerId: "partner-of-other-deal", commissionShare: 10 }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(managerUpdate).not.toHaveBeenCalled();
  });
});
