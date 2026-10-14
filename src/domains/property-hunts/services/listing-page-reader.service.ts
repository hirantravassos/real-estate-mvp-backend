import { Injectable, Logger } from "@nestjs/common";
import { BrowserContext } from "playwright-core";
import {
  isChallenge,
  ListingPage,
  politePause,
  readListingPage,
} from "../helpers/page-reader.helper";
import { PortalBrowserService } from "./portal-browser.service";

const PAUSE_BETWEEN_PAGES_MILLISECONDS = 1200;

export interface ReadPagesOptions {
  /** Most pages opened in this call. */
  limit: number;
  /** Stops opening new pages after this long, what was read is kept. */
  timeoutMilliseconds: number;
}

/**
 * Opens a few listing links in the browser and reads their public text,
 * signed out. Shared with other features that need to check a listing.
 */
@Injectable()
export class ListingPageReaderService {
  private readonly logger = new Logger(ListingPageReaderService.name);

  constructor(private readonly browserService: PortalBrowserService) {}

  get isAvailable() {
    return this.browserService.isAvailable;
  }

  /** Pages that could not be read are left out of the result. */
  async readPages(urls: string[], options: ReadPagesOptions) {
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
        this.readSite(host, siteUrls, deadline, pages),
      ),
    );
    return pages;
  }

  private async readSite(
    host: string,
    urls: string[],
    deadline: number,
    pages: Map<string, ListingPage>,
  ) {
    let context: BrowserContext | null = null;

    try {
      context = await this.browserService.newContext();
      const tab = await context.newPage();
      for (const [index, url] of urls.entries()) {
        if (Date.now() > deadline) break;
        if (index > 0) await politePause(PAUSE_BETWEEN_PAGES_MILLISECONDS);
        try {
          await tab.goto(url, { waitUntil: "domcontentloaded" });
          await tab
            .waitForLoadState("networkidle", { timeout: 6000 })
            .catch(() => undefined);
          if (await isChallenge(tab)) break;
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
