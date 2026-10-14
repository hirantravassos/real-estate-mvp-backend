import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash } from "crypto";
import dayjs from "dayjs";
import { BrowserContext, Page } from "playwright-core";
import { In, LessThan, MoreThanOrEqual, Repository } from "typeorm";
import { portalsConfig } from "../../../config/portals.config";
import { RealtimeGateway } from "../../../infrastructure/realtime/realtime.gateway";
import {
  LISTING_REUSE_DAYS,
  PORTAL_SEARCH_ENABLED,
  PORTALS,
} from "../constants/portals.constant";
import { HuntedListing } from "../entities/hunted-listing.entity";
import { PropertyHunt, PortalProgress } from "../entities/property-hunt.entity";
import { PropertyMatch } from "../entities/property-match.entity";
import {
  PortalKey,
  PortalProgressStatus,
  PropertyHuntStatus,
  PropertyMatchOrigin,
  PropertyMatchStatus,
} from "../enums/property-hunt.enum";
import { factsFromSnapshot } from "../helpers/match-facts.helper";
import { MINIMUM_MATCH_SCORE, scoreMatch } from "../helpers/match-score.helper";
import {
  collectListingLinks,
  humanPause,
  isChallenge,
  isLoginWall,
  ListingPage,
  readListingPage,
} from "../helpers/page-reader.helper";
import { truncate } from "../helpers/text.helper";
import { PropertyHuntMapper } from "../mappers/property-hunt.mapper";
import type { ListingSnapshot } from "../types/hunt-criteria.type";
import { CatalogMatcherService } from "./catalog-matcher.service";
import { HuntAiService, ListingAnalysis } from "./hunt-ai.service";
import { PortalBrowserService } from "./portal-browser.service";

/** Listings sent to the AI in one call. */
const ANALYSIS_BATCH_SIZE = 3;
/** Portals browsed at the same time within one hunt. */
const PARALLEL_PORTALS = 3;

class OutOfCreditsError extends Error {}

/** A listing read from its public page, waiting for the AI. */
interface ReadListing {
  /** The link found on the results, the key of the reuse. */
  link: string;
  page: ListingPage;
  portal: PortalKey;
}

/** What a match needs, from a fresh analysis or a reused one. */
interface ListingFit {
  portal: PortalKey;
  url: string;
  title: string;
  snapshot: ListingSnapshot;
  wishScore: number | null;
  wishNote: string | null;
  reused: boolean;
}

const hashUrl = (url: string) => createHash("sha256").update(url).digest("hex");

const reuseCutoff = () => dayjs().subtract(LISTING_REUSE_DAYS, "day").toDate();

interface RunState {
  hunt: PropertyHunt;
  cancelled: boolean;
  outOfCredits: boolean;
  /** Listing links already suggested before, skipped to save credits. */
  knownUrls: Set<string>;
  saving: Promise<unknown>;
}

/**
 * Runs the hunts in the background, one queue per server: the catalog
 * first, then every chosen portal, reading only the public pages anyone can
 * open (no login, no "ver telefone" clicks, never past a captcha), checking
 * each listing with the AI and keeping the ones that fit. Listings already
 * read for this broker in the last days are reused for free. Progress goes
 * live to the app, and everything found stays private to the broker.
 */
@Injectable()
export class PropertyHuntRunnerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PropertyHuntRunnerService.name);
  private readonly queue: string[] = [];
  private readonly running = new Map<string, RunState>();

  constructor(
    @Inject(portalsConfig.KEY)
    private readonly configuration: ConfigType<typeof portalsConfig>,
    @InjectRepository(PropertyHunt)
    private readonly huntRepository: Repository<PropertyHunt>,
    @InjectRepository(PropertyMatch)
    private readonly matchRepository: Repository<PropertyMatch>,
    @InjectRepository(HuntedListing)
    private readonly listingRepository: Repository<HuntedListing>,
    private readonly catalogMatcher: CatalogMatcherService,
    private readonly huntAiService: HuntAiService,
    private readonly browserService: PortalBrowserService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async onApplicationBootstrap() {
    await this.huntRepository
      .update(
        { status: PropertyHuntStatus.RUNNING },
        {
          status: PropertyHuntStatus.FAILED,
          errorMessage: "O servidor reiniciou no meio da busca. Rode de novo.",
          finishedAt: new Date(),
        },
      )
      .catch(() => undefined);
    // The advertiser data of old reads is not needed anymore.
    await this.listingRepository
      .delete({ analyzedAt: LessThan(reuseCutoff()) })
      .catch(() => undefined);
    const queued = await this.huntRepository
      .find({
        where: { status: PropertyHuntStatus.QUEUED },
        order: { createdAt: "ASC" },
        select: { id: true },
      })
      .catch(() => [] as PropertyHunt[]);
    for (const hunt of queued) this.enqueue(hunt.id);
  }

  enqueue(huntId: string) {
    if (!this.queue.includes(huntId)) this.queue.push(huntId);
    this.pump();
  }

  /** Position in the line, 0 when it is already running. */
  positionOf(huntId: string) {
    if (this.running.has(huntId)) return 0;
    const index = this.queue.indexOf(huntId);
    return index === -1 ? null : index + 1;
  }

  cancel(huntId: string) {
    const queuedIndex = this.queue.indexOf(huntId);
    if (queuedIndex !== -1) this.queue.splice(queuedIndex, 1);
    const state = this.running.get(huntId);
    if (state) state.cancelled = true;
    return { wasRunning: Boolean(state), wasQueued: queuedIndex !== -1 };
  }

  private pump() {
    while (
      this.running.size < this.configuration.concurrentHunts &&
      this.queue.length
    ) {
      const huntId = this.queue.shift() as string;
      void this.run(huntId);
    }
  }

  private async run(huntId: string) {
    const hunt = await this.huntRepository.findOne({
      where: { id: huntId },
      relations: { customer: true },
    });
    if (!hunt || hunt.status !== PropertyHuntStatus.QUEUED) {
      this.pump();
      return;
    }

    const state: RunState = {
      hunt,
      cancelled: false,
      outOfCredits: false,
      knownUrls: await this.knownUrls(hunt),
      saving: Promise.resolve(),
    };
    this.running.set(huntId, state);

    try {
      hunt.status = PropertyHuntStatus.RUNNING;
      hunt.startedAt = new Date();
      await this.persist(state);

      if (hunt.includeCatalog) await this.searchCatalog(state);

      // Hunts saved before the portal search was turned off skip the portals.
      const portals = PORTAL_SEARCH_ENABLED ? [...hunt.portals] : [];
      const workers = Array.from(
        { length: Math.min(PARALLEL_PORTALS, portals.length) },
        async () => {
          while (portals.length) {
            const portal = portals.shift() as PortalKey;
            await this.searchPortal(state, portal);
          }
        },
      );
      await Promise.all(workers);

      hunt.status = state.cancelled
        ? PropertyHuntStatus.CANCELLED
        : PropertyHuntStatus.FINISHED;
      if (state.outOfCredits) {
        hunt.errorMessage =
          "Seus créditos de IA acabaram no meio da busca. Compre mais e rode de novo.";
      }
    } catch (error) {
      this.logger.error(`Hunt ${huntId} failed: ${String(error)}`);
      hunt.status = PropertyHuntStatus.FAILED;
      hunt.errorMessage = "A busca parou por um erro. Tente de novo.";
    } finally {
      hunt.finishedAt = new Date();
      await this.persist(state).catch(() => undefined);
      this.running.delete(huntId);
      this.pump();
    }
  }

  private async searchCatalog(state: RunState) {
    const { hunt } = state;
    const found = await this.catalogMatcher.findMatches(
      hunt.userId,
      hunt.criteria,
    );
    const alreadyLinked = hunt.customerId
      ? new Set(
          (
            await this.matchRepository.find({
              where: {
                userId: hunt.userId,
                customerId: hunt.customerId,
                propertyId: In(found.map(({ property }) => property.id)),
                active: true,
              },
              select: { propertyId: true },
            })
          ).map((match) => match.propertyId),
        )
      : new Set<string | null>();

    const matches = found
      .filter(({ property }) => !alreadyLinked.has(property.id))
      .map(({ property, match }) =>
        this.matchRepository.create({
          userId: hunt.userId,
          huntId: hunt.id,
          customerId: hunt.customerId,
          propertyId: property.id,
          origin: PropertyMatchOrigin.CATALOG,
          portal: null,
          externalUrl: null,
          title: truncate(property.alias || property.address, 255),
          listing: null,
          coverImageUrl: null,
          price: property.price,
          score: match.score,
          highlights: match.highlights,
          warnings: match.warnings,
          status: PropertyMatchStatus.NEW,
          note: null,
        }),
      );
    if (matches.length) await this.matchRepository.save(matches);
    hunt.catalogMatches = matches.length;
    await this.persist(state);
    if (matches.length) this.notifyMatches(hunt);
  }

  private async searchPortal(state: RunState, portal: PortalKey) {
    const { hunt } = state;
    const progress = this.progressOf(hunt, portal);
    if (state.cancelled || state.outOfCredits) {
      progress.status = PortalProgressStatus.SKIPPED;
      await this.persist(state);
      return;
    }
    if (!this.browserService.isAvailable) {
      progress.status = PortalProgressStatus.SKIPPED;
      progress.message = "O navegador das buscas não está ligado no servidor.";
      await this.persist(state);
      return;
    }

    const definition = PORTALS[portal];
    let context: BrowserContext | null = null;

    try {
      // A fresh visitor, without cookies nor login: only the public pages.
      context = await this.browserService.newContext();
      const page = await context.newPage();
      progress.status = PortalProgressStatus.SEARCHING;
      progress.authenticated = false;
      await this.persist(state);

      await page.goto(definition.buildSearchUrl(hunt.criteria), {
        waitUntil: "domcontentloaded",
      });
      await humanPause(this.configuration.pageDelayMilliseconds);

      if (await isChallenge(page)) {
        progress.status = PortalProgressStatus.FAILED;
        progress.message =
          "O portal pediu uma verificação de segurança agora. Tente mais tarde.";
        return;
      }

      const links = (
        await collectListingLinks(
          page,
          definition,
          this.configuration.listingsPerPortal * 2,
        )
      ).filter((link) => !state.knownUrls.has(link));

      const reused = await this.reuseListings(state, progress, portal, links);
      const fresh = links
        .filter((link) => !reused.has(link))
        .slice(0, this.configuration.listingsPerPortal);

      progress.found = reused.size + fresh.length;
      progress.status = PortalProgressStatus.READING;
      if (!progress.found) {
        progress.message = "Nenhum anúncio novo com esses filtros.";
      }
      await this.persist(state);

      let batch: ReadListing[] = [];
      for (const link of fresh) {
        if (state.cancelled || state.outOfCredits) break;
        await humanPause(this.configuration.pageDelayMilliseconds);
        if (!(await this.openListing(page, link))) continue;
        // A listing behind a login is not public, it is left alone.
        if (await isLoginWall(page, definition)) continue;

        batch.push({ link, page: await readListingPage(page), portal });
        if (batch.length >= ANALYSIS_BATCH_SIZE) {
          await this.analyze(state, progress, batch);
          batch = [];
        }
      }
      if (batch.length && !state.outOfCredits) {
        await this.analyze(state, progress, batch);
      }
      progress.status = PortalProgressStatus.DONE;
    } catch (error) {
      if (error instanceof OutOfCreditsError) {
        progress.status = PortalProgressStatus.DONE;
        progress.message = "Parou: os créditos de IA acabaram.";
      } else {
        this.logger.warn(`Portal ${portal} failed: ${String(error)}`);
        progress.status = PortalProgressStatus.FAILED;
        progress.message =
          progress.message ?? "O portal não respondeu direito desta vez.";
      }
    } finally {
      if (context) await this.browserService.release(context);
      await this.persist(state).catch(() => undefined);
    }
  }

  private async openListing(page: Page, link: string) {
    try {
      await page.goto(link, { waitUntil: "domcontentloaded" });
      await page
        .waitForLoadState("networkidle", { timeout: 8000 })
        .catch(() => undefined);
      return !(await isChallenge(page));
    } catch {
      return false;
    }
  }

  /**
   * Listings this broker's hunts read in the last days skip the page and the
   * AI: they are scored again against this hunt, without spending credits.
   */
  private async reuseListings(
    state: RunState,
    progress: PortalProgress,
    portal: PortalKey,
    links: string[],
  ) {
    const reused = new Set<string>();
    if (!links.length) return reused;
    const { hunt } = state;

    const cached = await this.listingRepository
      .find({
        where: {
          userId: hunt.userId,
          urlHash: In(links.map(hashUrl)),
          analyzedAt: MoreThanOrEqual(reuseCutoff()),
          active: true,
        },
      })
      .catch(() => [] as HuntedListing[]);

    const fits: ListingFit[] = [];
    for (const listing of cached) {
      if (!links.includes(listing.url)) continue;
      reused.add(listing.url);
      if (!listing.isListing || !listing.snapshot) continue;
      fits.push({
        portal,
        url: listing.url,
        title: listing.title,
        snapshot: listing.snapshot,
        wishScore: null,
        wishNote: null,
        reused: true,
      });
    }

    progress.analyzed += reused.size;
    progress.reused = (progress.reused ?? 0) + reused.size;
    await this.saveFits(state, progress, fits);
    return reused;
  }

  private async analyze(
    state: RunState,
    progress: PortalProgress,
    batch: ReadListing[],
  ) {
    const { hunt } = state;
    let analyses: ListingAnalysis[];
    try {
      const result = await this.huntAiService.analyzeListings(
        hunt.userId,
        hunt.id,
        hunt.criteria,
        batch,
      );
      analyses = result.analyses;
      hunt.creditsCharged += result.creditsCharged;
    } catch (error) {
      if (
        error instanceof HttpException &&
        error.getStatus() === Number(HttpStatus.PAYMENT_REQUIRED)
      ) {
        state.outOfCredits = true;
        throw new OutOfCreditsError();
      }
      this.logger.warn(`Listing analysis failed: ${String(error)}`);
      progress.analyzed += batch.length;
      await this.persist(state);
      return;
    }

    progress.analyzed += batch.length;
    await this.remember(hunt.userId, batch, analyses);

    const fits: ListingFit[] = [];
    for (const analysis of analyses) {
      state.knownUrls.add(analysis.page.url);
      if (!analysis.isListing) continue;
      fits.push({
        portal: analysis.portal,
        url: analysis.page.url,
        title: analysis.title,
        snapshot: analysis.snapshot,
        wishScore: analysis.wishScore,
        wishNote: analysis.wishNote,
        reused: false,
      });
    }
    await this.saveFits(state, progress, fits);
  }

  /** Keeps every paid read, fit or not, so the next hunts reuse it. */
  private async remember(
    userId: string,
    batch: ReadListing[],
    analyses: ListingAnalysis[],
  ) {
    const analyzedAt = new Date();
    const rows = analyses.flatMap((analysis) => {
      const read = batch.find((item) => item.page === analysis.page);
      if (!read) return [];
      return [
        {
          userId,
          portal: read.portal,
          url: truncate(read.link, 1024),
          urlHash: hashUrl(read.link),
          isListing: analysis.isListing,
          title: truncate(analysis.title || read.page.title || "Anúncio", 255),
          snapshot: analysis.isListing ? analysis.snapshot : null,
          analyzedAt,
          active: true,
        },
      ];
    });
    if (!rows.length) return;
    await this.listingRepository
      .upsert(rows, {
        conflictPaths: ["userId", "urlHash"],
        skipUpdateIfNoValuesChanged: true,
      })
      .catch((error) =>
        this.logger.warn(`Listing reuse not saved: ${String(error)}`),
      );
  }

  /** Scores the listings against the hunt and keeps the ones that fit. */
  private async saveFits(
    state: RunState,
    progress: PortalProgress,
    fits: ListingFit[],
  ) {
    const { hunt } = state;
    const matches: PropertyMatch[] = [];
    for (const fit of fits) {
      // Reused reads were not checked against this hunt's extra wishes.
      const score = scoreMatch(
        factsFromSnapshot(fit.snapshot),
        hunt.criteria,
        fit.wishScore,
      );
      if (score.score < MINIMUM_MATCH_SCORE) continue;

      const highlights = [...score.highlights];
      const warnings = [...score.warnings];
      if (fit.wishNote) {
        if ((fit.wishScore ?? 0) >= 60) highlights.push(fit.wishNote);
        else warnings.push(fit.wishNote);
      }
      if (fit.reused) {
        highlights.push("Lido numa caçada recente, sem custo");
        if (hunt.criteria.extraWishes.length) {
          warnings.push("Desejos extras não conferidos neste anúncio");
        }
      }
      if (
        !fit.snapshot.advertiser.phones.length &&
        !fit.snapshot.advertiser.emails.length
      ) {
        warnings.push("Contato do anunciante só pelo portal");
      }

      matches.push(
        this.matchRepository.create({
          userId: hunt.userId,
          huntId: hunt.id,
          customerId: hunt.customerId,
          propertyId: null,
          origin: PropertyMatchOrigin.PORTAL,
          portal: fit.portal,
          externalUrl: truncate(fit.url, 1024),
          title: truncate(fit.title, 255),
          listing: fit.snapshot,
          coverImageUrl: fit.snapshot.photos[0]
            ? truncate(fit.snapshot.photos[0], 1024)
            : null,
          price:
            fit.snapshot.price === null ? null : fit.snapshot.price.toFixed(2),
          score: score.score,
          highlights: highlights.slice(0, 11),
          warnings: warnings.slice(0, 6),
          status: PropertyMatchStatus.NEW,
          note: null,
        }),
      );
    }

    if (matches.length) {
      await this.matchRepository.save(matches);
      progress.matched += matches.length;
      hunt.portalMatches += matches.length;
      this.notifyMatches(hunt);
    }
    await this.persist(state);
  }

  /** Listings already suggested to this customer, or in this hunt. */
  private async knownUrls(hunt: PropertyHunt) {
    if (!hunt.customerId) return new Set<string>();
    const matches = await this.matchRepository.find({
      where: {
        userId: hunt.userId,
        customerId: hunt.customerId,
        origin: PropertyMatchOrigin.PORTAL,
      },
      select: { externalUrl: true },
    });
    return new Set(
      matches
        .map((match) => match.externalUrl)
        .filter((url): url is string => Boolean(url)),
    );
  }

  private progressOf(hunt: PropertyHunt, portal: PortalKey) {
    let progress = hunt.progress.find((item) => item.portal === portal);
    if (!progress) {
      progress = {
        portal,
        status: PortalProgressStatus.WAITING,
        authenticated: false,
        found: 0,
        analyzed: 0,
        reused: 0,
        matched: 0,
        message: null,
      };
      hunt.progress.push(progress);
    }
    return progress;
  }

  /** Saves one change at a time, the portals report in parallel. */
  private persist(state: RunState) {
    const { hunt } = state;
    state.saving = state.saving
      .catch(() => undefined)
      .then(async () => {
        await this.huntRepository.update(
          { id: hunt.id },
          {
            status: hunt.status,
            progress: hunt.progress,
            catalogMatches: hunt.catalogMatches,
            portalMatches: hunt.portalMatches,
            creditsCharged: hunt.creditsCharged,
            errorMessage: hunt.errorMessage,
            startedAt: hunt.startedAt,
            finishedAt: hunt.finishedAt,
          },
        );
        this.realtimeGateway.emitToUser(
          hunt.userId,
          "hunt.updated",
          PropertyHuntMapper.toHuntDto(hunt),
        );
      });
    return state.saving;
  }

  private notifyMatches(hunt: PropertyHunt) {
    this.realtimeGateway.emitToUser(hunt.userId, "matches.updated", {
      huntId: hunt.id,
      customerId: hunt.customerId,
    });
  }
}
