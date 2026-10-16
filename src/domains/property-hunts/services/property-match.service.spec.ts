import "reflect-metadata";
import { Repository } from "typeorm";
import { RealtimeGateway } from "../../../infrastructure/realtime/realtime.gateway";
import { Customer } from "../../customers/entities/customer.entity";
import { Property } from "../../properties/entities/property.entity";
import { User } from "../../users/entities/user.entity";
import { PropertyMatchFilterDto } from "../dtos/property-hunt.dto";
import { PropertyMatch } from "../entities/property-match.entity";
import { PropertyMatchOrigin } from "../enums/property-hunt.enum";
import { PropertyMatchService } from "./property-match.service";

const OWNER = { id: "owner-broker" } as User;

const buildService = () => {
  const matchRepository = {
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
  };
  const service = new PropertyMatchService(
    matchRepository as unknown as Repository<PropertyMatch>,
    {} as Repository<Customer>,
    {} as Repository<Property>,
    { emitToUser: jest.fn() } as unknown as RealtimeGateway,
  );
  return { service, matchRepository };
};

const filterOf = (values: Partial<PropertyMatchFilterDto>) =>
  Object.assign(new PropertyMatchFilterDto(), values);

describe("PropertyMatchService.findAll", () => {
  it("lists only what the hunts found on the portals, of the broker asking", async () => {
    const { service, matchRepository } = buildService();

    await service.findAll(
      OWNER,
      filterOf({ origin: PropertyMatchOrigin.PORTAL }),
    );

    const [options] = matchRepository.findAndCount.mock.calls[0] as [
      { where: Record<string, unknown> },
    ];
    expect(options.where).toMatchObject({
      userId: OWNER.id,
      active: true,
      origin: PropertyMatchOrigin.PORTAL,
    });
  });

  it("never filters by age, a found listing stays until the broker erases it", async () => {
    const { service, matchRepository } = buildService();

    await service.findAll(
      OWNER,
      filterOf({ origin: PropertyMatchOrigin.PORTAL }),
    );

    const [options] = matchRepository.findAndCount.mock.calls[0] as [
      { where: Record<string, unknown> },
    ];
    expect(options.where).not.toHaveProperty("createdAt");
  });
});
