import { Page } from "playwright-core";
import { PortalDefinition } from "../constants/portals.constant";

const PAGE_TEXT_LIMIT = 9000;
const STRUCTURED_DATA_LIMIT = 4000;
const MAXIMUM_SCROLLS = 5;

const CHALLENGE_TEXT =
  /(n[aã]o sou um rob[oô]|verify you are human|verifique que voc[eê] [eé] humano|checking your browser|attention required|acesso negado|access denied)/i;

/**
 * What the scanner keeps of a public listing page, read later by the AI.
 * Photos, videos and the advertiser's contacts are never collected: the
 * broker sees them on the portal itself.
 */
export interface ListingPage {
  url: string;
  title: string;
  text: string;
  structuredData: string;
}

export const pause = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

/** Waits between two pages so a portal is never hit in a burst. */
export const politePause = (baseMilliseconds: number) =>
  pause(baseMilliseconds * (0.7 + Math.random() * 0.6));

/** Captchas and bot checks: the platform stops there, it never gets around them. */
export const isChallenge = async (page: Page) => {
  if (
    await page
      .locator(
        "iframe[src*='recaptcha'], iframe[src*='hcaptcha'], iframe[src*='challenges.cloudflare.com'], #challenge-form",
      )
      .count()
      .catch(() => 0)
  ) {
    return true;
  }
  const title = await page.title().catch(() => "");
  const text = await page
    .locator("body")
    .innerText({ timeout: 3000 })
    .catch(() => "");
  return CHALLENGE_TEXT.test(`${title}\n${text.substring(0, 1500)}`);
};

/** Scrolls the results so the lazy cards load, then keeps the listing links. */
export const collectListingLinks = async (
  page: Page,
  portal: PortalDefinition,
  limit: number,
) => {
  const links: string[] = [];
  for (let scroll = 0; scroll < MAXIMUM_SCROLLS; scroll += 1) {
    const hrefs = await page
      .$$eval("a[href]", (anchors) =>
        anchors.map((anchor) => (anchor as HTMLAnchorElement).href),
      )
      .catch(() => [] as string[]);

    for (const href of hrefs) {
      const clean = cleanListingUrl(href);
      if (!clean || !portal.listingUrlPattern.test(clean)) continue;
      if (!links.includes(clean)) links.push(clean);
    }
    if (links.length >= limit) break;
    await page.mouse.wheel(0, 2200).catch(() => undefined);
    await pause(900);
  }
  return links.slice(0, limit);
};

const cleanListingUrl = (href: string) => {
  try {
    const url = new URL(href);
    url.hash = "";
    // Tracking parameters change between visits, the path is the listing.
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|from|source|origin|ref|position|pos|sid|lis)/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    return url.toString();
  } catch {
    return null;
  }
};

export const readListingPage = async (page: Page): Promise<ListingPage> =>
  page.evaluate(
    ({ textLimit, structuredLimit }) => ({
      url: location.href,
      title: document.title,
      text: (document.body?.innerText ?? "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .substring(0, textLimit),
      structuredData: Array.from(
        document.querySelectorAll("script[type='application/ld+json']"),
      )
        .map((script) => script.textContent ?? "")
        .join("\n")
        .substring(0, structuredLimit),
    }),
    { textLimit: PAGE_TEXT_LIMIT, structuredLimit: STRUCTURED_DATA_LIMIT },
  );
