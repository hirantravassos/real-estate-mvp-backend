import { Injectable, Logger } from "@nestjs/common";
import { BrowserContext } from "playwright-core";
import { PORTAL_KEYS, PORTALS } from "../constants/portals.constant";
import { PortalKey } from "../enums/property-hunt.enum";
import {
  humanPause,
  isChallenge,
  ListingPage,
  readListingPage,
  revealContacts,
} from "../helpers/page-reader.helper";
import { PortalAccountService } from "./portal-account.service";
import { PortalBrowserService } from "./portal-browser.service";

const PAUSE_BETWEEN_PAGES_MILLISECONDS = 1200;

export interface ReadPagesOptions {
  /** Most pages opened in this call. */
  limit: number;
  /** Stops opening new pages after this long, what was read is kept. */
  timeoutMilliseconds: number;
}

/**
 * Opens a few listing links in the browser and reads them, signed in on the
 * portals the broker connected, pressing "ver telefone" on each one. Shared
 * with other features that need to check a listing for real.
 */
@Injectable()
export class ListingPageReaderService {
  private readonly logger = new Logger(ListingPageReaderService.name);

  constructor(
    private readonly browserService: PortalBrowserService,
    private readonly accountService: PortalAccountService,
  ) {}

  get isAvailable() {
    return this.browserService.isAvailable;
  }

  /** Pages that could not be read are left out of the result. */
  async readPages(userId: string, urls: string[], options: ReadPagesOptions) {
    const pages = new Map<string, ListingPage>();
    if (!this.isAvailable) return pages;

    const deadline = Date.now() + options.timeoutMilliseconds;
    const byHost = new Map<string, string[]>();
    for (const url of urls.slice(0, options.limit)) {
      const host = hostOf(url);
      if (!host) continue;
      byHost.set(host, [...(byHost.get(host) ?? []), url]);
    }

    // One tab per site at the same time, one page after the other inside it.
    await Promise.all(
      [...byHost.entries()].map(([host, siteUrls]) =>
        this.readSite(userId, host, siteUrls, deadline, pages),
      ),
    );
    return pages;
  }

  private async readSite(
    userId: string,
    host: string,
    urls: string[],
    deadline: number,
    pages: Map<string, ListingPage>,
  ) {
    const portal = portalOfHost(host);
    const session = portal
      ? await this.accountService.sessionFor(userId, portal).catch(() => null)
      : null;
    let context: BrowserContext | null = null;

    try {
      context = await this.browserService.newContext(session?.storageState);
      const tab = await context.newPage();
      for (const [index, url] of urls.entries()) {
        if (Date.now() > deadline) break;
        if (index > 0) await humanPause(PAUSE_BETWEEN_PAGES_MILLISECONDS);
        try {
          await tab.goto(url, { waitUntil: "domcontentloaded" });
          await tab
            .waitForLoadState("networkidle", { timeout: 6000 })
            .catch(() => undefined);
          if (await isChallenge(tab)) break;
          await revealContacts(tab);
          pages.set(url, await readListingPage(tab));
        } catch (error) {
          this.logger.debug(`Could not read ${url}: ${String(error)}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Could not open ${host}: ${String(error)}`);
    } finally {
      if (context) await this.browserService.release(context);
    }
  }
}

const hostOf = (url: string) => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:")
      return null;
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
};

const portalOfHost = (host: string): PortalKey | null =>
  PORTAL_KEYS.find((key) => {
    const portalHost = new URL(PORTALS[key].homeUrl).hostname.replace(
      /^www\./,
      "",
    );
    return host === portalHost || host.endsWith(`.${portalHost}`);
  }) ?? null;
