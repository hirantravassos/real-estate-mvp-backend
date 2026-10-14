import { NotFoundException } from "@nestjs/common";
import { DataSource, EntityManager, Repository } from "typeorm";
import { Customer } from "../../customers/entities/customer.entity";
import { User } from "../../users/entities/user.entity";
import { DealParticipant } from "../entities/deal-participant.entity";
import { Deal } from "../entities/deal.entity";
import { DealParticipantRole } from "../enums/deal.enum";
import { DealActivityService } from "./deal-activity.service";
import { DealParticipantService } from "./deal-participant.service";
import { DealService } from "./deal.service";

const owner = { id: "broker-1" } as User;
const intruder = { id: "broker-2" } as User;

const buildService = () => {
  const deal = { id: "deal-1", userId: owner.id, active: true };
  const participant = {
    id: "participant-1",
    dealId: deal.id,
    role: DealParticipantRole.SELLER,
    name: "Vendedor 1",
  };
  const transaction = jest.fn();
  const dataSource = {
    transaction,
    manager: {} as EntityManager,
  } as unknown as DataSource;
  const dealRepository = {
    findOne: jest.fn(({ where }: { where: { id: string; userId: string } }) =>
      Promise.resolve(
        where.id === deal.id && where.userId === deal.userId ? deal : null,
      ),
    ),
  } as unknown as Repository<Deal>;
  const saveParticipant = jest.fn();
  const participantRepository = {
    findOne: jest.fn(
      ({
        where,
      }: {
        where: { id: string; dealId: string; deal: { userId: string } };
      }) =>
        Promise.resolve(
          where.id === participant.id &&
            where.dealId === deal.id &&
            where.deal.userId === deal.userId
            ? participant
            : null,
        ),
    ),
    save: saveParticipant,
  } as unknown as Repository<DealParticipant>;
  const customerRepository = {
    findOne: jest.fn(({ where }: { where: { userId: string } }) =>
      Promise.resolve(
        where.userId === owner.id
          ? { id: "customer-1", userId: owner.id, name: "Ana", roles: [] }
          : null,
      ),
    ),
  } as unknown as Repository<Customer>;
  const service = new DealParticipantService(
    dataSource,
    dealRepository,
    participantRepository,
    customerRepository,
    {
      assertOpen: jest.fn(),
      findOne: jest.fn().mockResolvedValue({}),
    } as unknown as DealService,
    { record: jest.fn() } as unknown as DealActivityService,
  );
  return { service, transaction, saveParticipant };
};

describe("DealParticipantService", () => {
  it("never adds a person to another broker's sale", async () => {
    const { service, transaction } = buildService();
    await expect(
      service.addParticipant(intruder, "deal-1", {
        role: DealParticipantRole.BUYER,
        name: "Comprador 2",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("never links a contact of another broker", async () => {
    const { service, transaction } = buildService();
    const customerRepository = (
      service as unknown as { customerRepository: Repository<Customer> }
    ).customerRepository;
    (customerRepository.findOne as jest.Mock).mockResolvedValueOnce(null);
    await expect(
      service.addParticipant(owner, "deal-1", {
        role: DealParticipantRole.SELLER,
        customerId: "customer-of-broker-2",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("never renames or removes a person of another broker's sale", async () => {
    const { service, transaction, saveParticipant } = buildService();
    await expect(
      service.updateParticipant(intruder, "deal-1", "participant-1", {
        name: "Outro",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.removeParticipant(intruder, "deal-1", "participant-1"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(saveParticipant).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });
});
