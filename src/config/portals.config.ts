import { registerAs } from "@nestjs/config";

export const portalsConfig = registerAs("portals", () => ({
  /** Encrypts the portal passwords and sessions. Falls back to the JWT secret. */
  credentialsSecret:
    process.env.PORTAL_CREDENTIALS_SECRET || process.env.JWT_SECRET || "",
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
  /** Pause between two pages of the same portal, to browse like a person. */
  pageDelayMilliseconds: Math.max(
    500,
    parseInt(process.env.PORTAL_PAGE_DELAY_MILLISECONDS || "2500", 10),
  ),
  /** Hunts running at the same time on this server, each opens a browser tab. */
  concurrentHunts: Math.max(
    1,
    parseInt(process.env.PORTAL_CONCURRENT_HUNTS || "1", 10),
  ),
  /** Manages the platform accounts, shared by every broker. */
  adminKey: process.env.CREDITS_ADMIN_KEY ?? "",
  /**
   * The platform's own mark, a PNG with transparency, stamped on every photo
   * a hunt brings into the neighborhood. Left empty, photos stay as they are.
   */
  importWatermarkUrl: process.env.IMPORT_PHOTO_WATERMARK_URL ?? "",
  /** bottom-right, bottom-left, top-right, top-left or center. */
  importWatermarkPosition:
    process.env.IMPORT_PHOTO_WATERMARK_POSITION || "bottom-right",
  importWatermarkOpacity: Math.min(
    1,
    Math.max(
      0.1,
      parseFloat(process.env.IMPORT_PHOTO_WATERMARK_OPACITY || "0.7"),
    ),
  ),
  /** Width of the mark against the photo width, from 0.05 to 0.6. */
  importWatermarkWidthRatio: Math.min(
    0.6,
    Math.max(
      0.05,
      parseFloat(process.env.IMPORT_PHOTO_WATERMARK_WIDTH_RATIO || "0.22"),
    ),
  ),
}));
