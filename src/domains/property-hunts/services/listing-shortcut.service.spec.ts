import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Repository } from "typeorm";
import { User } from "../../users/entities/user.entity";
import { ListingShortcut } from "../entities/listing-shortcut.entity";
import { PropertyMatch } from "../entities/property-match.entity";
import {
  PortalKey,
  PropertyMatchOrigin,
  PropertyMatchStatus,
} from "../enums/property-hunt.enum";
import { ListingShortcutService } from "./listing-shortcut.service";

const OWNER = { id: "owner-broker" } as User;
const OTHER = { id: "other-broker" } as User;

const portalMatch = {
  id: "match-1",
  userId: OWNER.id,
  active: true,
  origin: PropertyMatchOrigin.PORTAL,
  portal: PortalKey.ZAP_IMOVEIS,
  externalUrl: "https://www.zapimoveis.com.br/imovel/venda-apartamento-1",
  title: "Apartamento 3 quartos no Embaré",
  price: "850000.00",
  status: PropertyMatchStatus.NEW,
  listing: {
    kind: null,
    transaction: "sale",
    price: 850000,
    maintenanceFee: null,
    propertyTax: null,
    neighborhood: "Embaré",
    city: "Santos",
    state: "SP",
    bedrooms: 3,
    suites: 1,
    bathrooms: 2,
    parkingSpaces: 1,
    area: 98,
    floor: null,
    beachDistanceMeters: null,
    beachDistanceEstimated: false,
    amenities: [],
    description: "Vista para o mar. Ligue (13) 99123-4567.",
  },
} as unknown as PropertyMatch;

const buildService = () => {
  const saved: Partial<ListingShortcut>[] = [];
  const shortcutRepository = {
    findOneBy: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn((value: Partial<ListingShortcut>) => value),
    save: jest.fn((value: Partial<ListingShortcut>) => {
      saved.push(value);
      return Promise.resolve({
        ...value,
        id: "shortcut-1",
        createdAt: new Date("2026-10-14T12:00:00.000Z"),
      });
    }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  // The repository honours the where clause: a match of another broker is not found.
  const matchRepository = {
    findOneBy: jest.fn(({ id, userId }: { id: string; userId: string }) =>
      Promise.resolve(
        id === portalMatch.id && userId === portalMatch.userId
          ? portalMatch
          : null,
      ),
    ),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const service = new ListingShortcutService(
    shortcutRepository as unknown as Repository<ListingShortcut>,
    matchRepository as unknown as Repository<PropertyMatch>,
  );
  return { service, saved, shortcutRepository, matchRepository };
};

describe("ListingShortcutService", () => {
  it("keeps only the card data, without contacts", async () => {
    const { service, saved } = buildService();

    const result = await service.createFromMatch(OWNER, portalMatch.id);

    expect(result.created).toBe(true);
    expect(saved[0]).toMatchObject({
      userId: OWNER.id,
      externalUrl: portalMatch.externalUrl,
      bedrooms: 3,
      area: "98.00",
      neighborhood: "Embaré",
      city: "Santos",
    });
    expect(saved[0].summary).not.toContain("99123");
  });

  it("never lets another broker save someone else's suggestion", async () => {
    const { service, saved } = buildService();

    await expect(
      service.createFromMatch(OTHER, portalMatch.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(saved).toHaveLength(0);
  });

  it("only deletes shortcuts of the broker asking", async () => {
    const { service, shortcutRepository } = buildService();

    await expect(service.remove(OTHER, "shortcut-1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(shortcutRepository.findOneBy).toHaveBeenCalledWith({
      id: "shortcut-1",
      userId: OTHER.id,
      active: true,
    });
    expect(shortcutRepository.delete).not.toHaveBeenCalled();
  });

  it("refuses catalog suggestions", async () => {
    const { service, matchRepository } = buildService();
    matchRepository.findOneBy.mockResolvedValueOnce({
      ...portalMatch,
      origin: PropertyMatchOrigin.CATALOG,
      portal: null,
      externalUrl: null,
    });

    await expect(
      service.createFromMatch(OWNER, portalMatch.id),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
