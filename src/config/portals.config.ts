import { registerAs } from "@nestjs/config";

export const portalsConfig = registerAs("portals", () => ({
  /** A remote Chrome (Browserless and the like), preferred when set. */
  browserWebSocketEndpoint: process.env.PORTAL_BROWSER_WS_ENDPOINT ?? "",
  /** A local Chrome or Chromium, found on its own when left empty. */
  browserExecutablePath: process.env.PORTAL_BROWSER_EXECUTABLE_PATH ?? "",
  headless: process.env.PORTAL_BROWSER_HEADLESS !== "false",
  /** Listings opened and read by the AI on each portal of a hunt. */
  listingsPerPortal: Math.min(
    30,
    Math.max(1, parseInt(process.env.PORTAL_LISTINGS_PER_PORTAL || "10", 10)),
  ),
  /** Pause between two pages of the same portal, so it is never hit in a burst. */
  pageDelayMilliseconds: Math.max(
    500,
    parseInt(process.env.PORTAL_PAGE_DELAY_MILLISECONDS || "2500", 10),
  ),
  /** Hunts running at the same time on this server, each opens a browser tab. */
  concurrentHunts: Math.max(
    1,
    parseInt(process.env.PORTAL_CONCURRENT_HUNTS || "1", 10),
  ),
}));
