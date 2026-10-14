import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { dataRetentionConfig } from "../../../config/data-retention.config";
import { ListingShortcut } from "../entities/listing-shortcut.entity";
import { PropertyMatch } from "../entities/property-match.entity";
import { PropertyMatchOrigin } from "../enums/property-hunt.enum";
import { retentionStart } from "./listing-shortcut.service";

const SWEEP_INTERVAL_MILLISECONDS = 24 * 60 * 60 * 1000;
/** Waits for the boot to settle before the first sweep. */
const FIRST_SWEEP_DELAY_MILLISECONDS = 12 * 60 * 1000;

/**
 * Once a day erases, for good, the portal suggestions and the listing
 * shortcuts older than LISTING_RETENTION_DAYS. Idempotent, two servers are
 * fine. Catalog suggestions point to the broker's own properties and stay.
 */
@Injectable()
export class ListingRetentionService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(ListingRetentionService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(dataRetentionConfig.KEY)
    private readonly configuration: ConfigType<typeof dataRetentionConfig>,
    @InjectRepository(PropertyMatch)
    private readonly matchRepository: Repository<PropertyMatch>,
    @InjectRepository(ListingShortcut)
    private readonly shortcutRepository: Repository<ListingShortcut>,
  ) {}

  onApplicationBootstrap() {
    if (!this.configuration.scheduleEnabled) return;
    this.timer = setTimeout(() => {
      void this.sweep();
      this.timer = setInterval(
        () => void this.sweep(),
        SWEEP_INTERVAL_MILLISECONDS,
      );
      this.timer.unref();
    }, FIRST_SWEEP_DELAY_MILLISECONDS);
    this.timer.unref();
  }

  onApplicationShutdown() {
    if (this.timer) clearTimeout(this.timer);
  }

  async sweep(now = new Date()) {
    try {
      const limit = retentionStart(now);
      const matches = await this.matchRepository.delete({
        origin: PropertyMatchOrigin.PORTAL,
        createdAt: LessThan(limit),
      });
      const shortcuts = await this.shortcutRepository.delete({
        createdAt: LessThan(limit),
      });
      this.logger.log(
        `Listing retention: ${matches.affected ?? 0} portal suggestions and ${shortcuts.affected ?? 0} shortcuts removed`,
      );
    } catch (error) {
      this.logger.error(`Listing retention failed: ${String(error)}`);
    }
  }
}
