import { Locator, Page } from "playwright-core";
import { PortalDefinition } from "../constants/portals.constant";

const PAGE_TEXT_LIMIT = 9000;
const STRUCTURED_DATA_LIMIT = 4000;
const MAXIMUM_PHOTOS = 40;
const MAXIMUM_SCROLLS = 5;

const CONTACT_BUTTON_TEXT =
  /(ver|mostrar|exibir|revelar)\s+(o\s+)?(telefone|n[uú]mero|contato|celular)/i;

const CHALLENGE_TEXT =
  /(n[aã]o sou um rob[oô]|verify you are human|verifique que voc[eê] [eé] humano|checking your browser|attention required|acesso negado|access denied)/i;

/** What the scanner keeps of a listing page, read later by the AI. */
export interface ListingPage {
  url: string;
  title: string;
  text: string;
  structuredData: string;
  photos: string[];
  videos: string[];
  /** Phones, WhatsApp links and emails found on the page. */
  contacts: string[];
}

export const pause = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

/** A little random so the visits do not tick like a clock. */
export const humanPause = (baseMilliseconds: number) =>
  pause(baseMilliseconds * (0.7 + Math.random() * 0.6));

export const firstVisible = async (page: Page, selectors: string[]) => {
  for (const selector of selectors) {
    const candidates = page.locator(selector);
    const count = Math.min(await candidates.count().catch(() => 0), 5);
    for (let index = 0; index < count; index += 1) {
      const candidate = candidates.nth(index);
      if (await candidate.isVisible().catch(() => false)) return candidate;
    }
  }
  return null;
};

export const clickFirstVisible = async (
  page: Page,
  selectors: string[],
): Promise<Locator | null> => {
  const target = await firstVisible(page, selectors);
  if (!target) return null;
  await target.click({ timeout: 5000 }).catch(() => undefined);
  return target;
};

export const PASSWORD_SELECTORS = ["input[type='password']"];

/** The portal sent us to its login page or asks for a password right here. */
export const isLoginWall = async (page: Page, portal: PortalDefinition) => {
  const loginPath = new URL(portal.loginUrl).pathname.replace(/\/$/, "");
  const current = new URL(page.url());
  if (
    loginPath &&
    loginPath !== "" &&
    current.hostname === new URL(portal.loginUrl).hostname &&
    current.pathname.replace(/\/$/, "") === loginPath
  ) {
    return true;
  }
  return Boolean(await firstVisible(page, PASSWORD_SELECTORS));
};

/** Captchas and bot checks, which the platform never tries to get around. */
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

/**
 * Presses the "ver telefone" buttons, the reason the portals are browsed
 * signed in: most of them only show the advertiser's phone to members.
 */
export const revealContacts = async (page: Page) => {
  const buttons = page.getByRole("button", { name: CONTACT_BUTTON_TEXT });
  const count = Math.min(await buttons.count().catch(() => 0), 2);
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    if (!(await button.isVisible().catch(() => false))) continue;
    await button.click({ timeout: 4000 }).catch(() => undefined);
    await pause(1500);
  }
};

export const readListingPage = async (page: Page): Promise<ListingPage> => {
  const snapshot = await page.evaluate(
    ({ textLimit, structuredLimit, photoLimit }) => {
      const absolute = (value: string | null | undefined) => {
        if (!value) return null;
        try {
          return new URL(value.trim().split(" ")[0], location.href).toString();
        } catch {
          return null;
        }
      };

      const structuredData = Array.from(
        document.querySelectorAll("script[type='application/ld+json']"),
      )
        .map((script) => script.textContent ?? "")
        .join("\n")
        .substring(0, structuredLimit);

      const photos = new Set<string>();
      const meta = document.querySelector<HTMLMetaElement>(
        "meta[property='og:image']",
      );
      const ogImage = absolute(meta?.content);
      if (ogImage) photos.add(ogImage);
      for (const image of Array.from(document.images)) {
        const sources = [
          image.currentSrc,
          image.src,
          image.getAttribute("data-src"),
          image.getAttribute("data-lazy"),
          ...(image.getAttribute("srcset") ?? "")
            .split(",")
            .slice(-1)
            .map((part) => part.trim()),
        ];
        const wide =
          image.naturalWidth >= 360 ||
          image.width >= 240 ||
          /\d{3,4}x\d{3,4}|resize|fit-in|\/(crop|images?|fotos?)\//i.test(
            sources.join(" "),
          );
        if (!wide) continue;
        for (const source of sources) {
          const url = absolute(source);
          if (!url || url.startsWith("data:")) continue;
          if (/(logo|icon|sprite|avatar|placeholder|pixel|banner)/i.test(url)) {
            continue;
          }
          photos.add(url);
          break;
        }
        if (photos.size >= photoLimit) break;
      }

      const videos = new Set<string>();
      for (const element of Array.from(
        document.querySelectorAll("video source, video, iframe"),
      )) {
        const url = absolute(element.getAttribute("src"));
        if (!url) continue;
        if (
          element.tagName !== "IFRAME" ||
          /youtube|youtu\.be|vimeo|tour|matterport/i.test(url)
        ) {
          videos.add(url);
        }
      }

      const contacts = new Set<string>();
      for (const anchor of Array.from(
        document.querySelectorAll<HTMLAnchorElement>("a[href]"),
      )) {
        const href = anchor.href;
        if (/^tel:|^mailto:|wa\.me\/|api\.whatsapp\.com/i.test(href)) {
          contacts.add(decodeURIComponent(href));
        }
        if (/youtube\.com\/watch|youtu\.be\//i.test(href)) videos.add(href);
      }

      return {
        url: location.href,
        title: document.title,
        text: (document.body?.innerText ?? "")
          .replace(/[ \t]+/g, " ")
          .replace(/\n{3,}/g, "\n\n")
          .substring(0, textLimit),
        structuredData,
        photos: Array.from(photos).slice(0, photoLimit),
        videos: Array.from(videos).slice(0, 10),
        contacts: Array.from(contacts).slice(0, 10),
      };
    },
    {
      textLimit: PAGE_TEXT_LIMIT,
      structuredLimit: STRUCTURED_DATA_LIMIT,
      photoLimit: MAXIMUM_PHOTOS,
    },
  );

  const phonesInText =
    snapshot.text.match(/\(?\b\d{2}\)?\s?9?\d{4}[-\s.]?\d{4}\b/g) ?? [];
  return {
    ...snapshot,
    contacts: [...new Set([...snapshot.contacts, ...phonesInText])].slice(
      0,
      12,
    ),
  };
};
