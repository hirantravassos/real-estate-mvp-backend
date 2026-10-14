import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { existsSync, readdirSync } from "fs";
import * as path from "path";
import { Browser, BrowserContext, chromium } from "playwright-core";
import { portalsConfig } from "../../../config/portals.config";

/** Closes the browser after this long without any tab open. */
const IDLE_CLOSE_MILLISECONDS = 3 * 60 * 1000;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

const SYSTEM_BROWSERS = [
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
];

/** Playwright's own downloads, used in development. */
const playwrightBrowsers = () => {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/pw-browsers";
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .filter((folder) => /^chromium-\d+$/.test(folder))
    .sort()
    .reverse()
    .flatMap((folder) => [
      path.join(root, folder, "chrome-linux64", "chrome"),
      path.join(root, folder, "chrome-linux", "chrome"),
    ]);
};

/**
 * One shared Chrome for every hunt. Each job gets its own clean context
 * (no cookies, never signed in), closed as soon as the job ends.
 */
@Injectable()
export class PortalBrowserService implements OnApplicationShutdown {
  private readonly logger = new Logger(PortalBrowserService.name);
  private browser: Browser | null = null;
  private launching: Promise<Browser> | null = null;
  private openContexts = 0;
  private idleTimer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(portalsConfig.KEY)
    private readonly configuration: ConfigType<typeof portalsConfig>,
  ) {}

  /** False when the server has neither a remote nor a local browser. */
  get isAvailable() {
    return Boolean(
      this.configuration.browserWebSocketEndpoint || this.executablePath(),
    );
  }

  async newContext(): Promise<BrowserContext> {
    const browser = await this.ensureBrowser();
    this.openContexts += 1;
    this.clearIdleTimer();

    try {
      const context = await browser.newContext({
        locale: "pt-BR",
        timezoneId: "America/Sao_Paulo",
        viewport: { width: 1366, height: 900 },
        userAgent: USER_AGENT,
      });
      context.setDefaultTimeout(20_000);
      context.setDefaultNavigationTimeout(45_000);
      // Fonts and videos are never read, skipping them saves time and data.
      await context.route(/\.(woff2?|ttf|otf|mp4|webm|m3u8)(\?|$)/i, (route) =>
        route.abort(),
      );
      return context;
    } catch (error) {
      this.openContexts = Math.max(0, this.openContexts - 1);
      throw error;
    }
  }

  async release(context: BrowserContext) {
    await context.close().catch(() => undefined);
    this.openContexts = Math.max(0, this.openContexts - 1);
    if (this.openContexts === 0) this.scheduleIdleClose();
  }

  async onApplicationShutdown() {
    this.clearIdleTimer();
    await this.browser?.close().catch(() => undefined);
  }

  private async ensureBrowser() {
    if (this.browser?.isConnected()) return this.browser;
    if (!this.launching) {
      this.launching = this.launch().finally(() => {
        this.launching = null;
      });
    }
    this.browser = await this.launching;
    return this.browser;
  }

  private async launch() {
    const endpoint = this.configuration.browserWebSocketEndpoint;
    if (endpoint) {
      this.logger.log("Connecting to the remote browser");
      return chromium.connectOverCDP(endpoint);
    }

    const executablePath = this.executablePath();
    if (!executablePath) {
      throw new ServiceUnavailableException(
        "O navegador das buscas não está instalado no servidor.",
      );
    }
    this.logger.log(`Launching the browser at ${executablePath}`);
    return chromium.launch({
      executablePath,
      headless: this.configuration.headless,
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--lang=pt-BR",
      ],
    });
  }

  private executablePath() {
    const configured = this.configuration.browserExecutablePath;
    if (configured) return existsSync(configured) ? configured : null;
    return (
      [...SYSTEM_BROWSERS, ...playwrightBrowsers()].find((candidate) =>
        existsSync(candidate),
      ) ?? null
    );
  }

  private scheduleIdleClose() {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      if (this.openContexts > 0 || !this.browser) return;
      const browser = this.browser;
      this.browser = null;
      void browser.close().catch(() => undefined);
    }, IDLE_CLOSE_MILLISECONDS);
  }

  private clearIdleTimer() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }
}
