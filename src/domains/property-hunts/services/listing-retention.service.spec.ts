import { LessThan, Repository } from "typeorm";
import { ListingShortcut } from "../entities/listing-shortcut.entity";
import { PropertyMatch } from "../entities/property-match.entity";
import { PropertyMatchOrigin } from "../enums/property-hunt.enum";
import { ListingRetentionService } from "./listing-retention.service";

describe("ListingRetentionService.sweep", () => {
  it("erases portal suggestions and shortcuts older than 90 days", async () => {
    const matchDelete = jest.fn().mockResolvedValue({ affected: 2 });
    const shortcutDelete = jest.fn().mockResolvedValue({ affected: 1 });
    const service = new ListingRetentionService(
      { scheduleEnabled: true },
      { delete: matchDelete } as unknown as Repository<PropertyMatch>,
      { delete: shortcutDelete } as unknown as Repository<ListingShortcut>,
    );

    await service.sweep(new Date("2026-10-14T12:00:00.000Z"));

    const limit = LessThan(new Date("2026-07-16T12:00:00.000Z"));
    expect(matchDelete).toHaveBeenCalledWith({
      origin: PropertyMatchOrigin.PORTAL,
      createdAt: limit,
    });
    expect(shortcutDelete).toHaveBeenCalledWith({ createdAt: limit });
  });
});
