import { Injectable, Logger, OnApplicationShutdown } from "@nestjs/common";
import { BrowserContext, Page } from "playwright-core";
import { PORTALS } from "../constants/portals.constant";
import { PortalKey } from "../enums/property-hunt.enum";
import {
  clickFirstVisible,
  firstVisible,
  humanPause,
  isChallenge,
  PASSWORD_SELECTORS,
  pause,
} from "../helpers/page-reader.helper";
import { PortalBrowserService } from "./portal-browser.service";

/** How long a login waits for the code the portal sent by email or SMS. */
const CODE_WAIT_MILLISECONDS = 10 * 60 * 1000;

const EMAIL_SELECTORS = [
  "input[type='email']",
  "input[autocomplete='email']",
  "input[autocomplete='username']",
  "input[name*='email' i]",
  "input[id*='email' i]",
  "input[name*='login' i]",
  "input[name*='user' i]",
];

const CODE_SELECTORS = [
  "input[autocomplete='one-time-code']",
  "input[name*='codigo' i]",
  "input[name*='code' i]",
  "input[id*='codigo' i]",
  "input[id*='code' i]",
  "input[inputmode='numeric'][maxlength='1']",
];

const SUBMIT_SELECTORS = [
  "button[type='submit']",
  "button:text-matches('^\\s*(entrar|continuar|acessar|avan[cç]ar|pr[oó]ximo|login|confirmar|verificar|enviar)\\s*$', 'i')",
  "input[type='submit']",
];

const EMAIL_ENTRY_SELECTORS = [
  "button:text-matches('(entrar|continuar|acessar) com (o )?e-?mail', 'i')",
  "a:text-matches('(entrar|continuar|acessar) com (o )?e-?mail', 'i')",
];

const COOKIE_SELECTORS = [
  "button:text-matches('^\\s*(aceitar|aceito|concordo|entendi|ok, entendi|permitir todos?)\\s*$', 'i')",
];

const REJECTED_TEXT =
  /(senha (incorreta|inv[aá]lida)|e-?mail ou senha|dados (incorretos|inv[aá]lidos)|n[aã]o (foi poss[ií]vel|conseguimos) (entrar|fazer login)|usu[aá]rio n[aã]o encontrado)/i;

export type SignInResult =
  | { status: "connected"; storageState: string }
  | { status: "awaiting_code"; message: string }
  | { status: "failed"; message: string };

interface PendingLogin {
  portal: PortalKey;
  context: BrowserContext;
  page: Page;
  timer: NodeJS.Timeout;
}

/**
 * Signs in to the portals the way a person would: fills the email and the
 * password, and when the portal sends a code, waits for the broker to type
 * it. The signed in cookies are what the hunts reuse later.
 */
@Injectable()
export class PortalSessionService implements OnApplicationShutdown {
  private readonly logger = new Logger(PortalSessionService.name);
  private readonly pending = new Map<string, PendingLogin>();

  constructor(private readonly browserService: PortalBrowserService) {}

  get isAvailable() {
    return this.browserService.isAvailable;
  }

  /**
   * @param loginKey identifies the login while it waits for a code, the
   * account id.
   */
  async signIn(
    loginKey: string,
    portalKey: PortalKey,
    login: string,
    password: string | null,
  ): Promise<SignInResult> {
    await this.discardPending(loginKey);
    const portal = PORTALS[portalKey];
    const context = await this.browserService.newContext();
    let keepOpen = false;

    try {
      const page = await context.newPage();
      await page.goto(portal.loginUrl, { waitUntil: "domcontentloaded" });
      await humanPause(1800);
      await clickFirstVisible(page, COOKIE_SELECTORS);

      if (await isChallenge(page)) return challengeFailure();

      let emailField = await firstVisible(page, EMAIL_SELECTORS);
      if (!emailField) {
        await clickFirstVisible(page, EMAIL_ENTRY_SELECTORS);
        await pause(1500);
        emailField = await firstVisible(page, EMAIL_SELECTORS);
      }
      if (!emailField) {
        return {
          status: "failed",
          message: "Não encontramos o formulário de login do portal agora.",
        };
      }
      await emailField.fill(login);
      await humanPause(600);

      let passwordField = await firstVisible(page, PASSWORD_SELECTORS);
      if (!passwordField) {
        await clickFirstVisible(page, SUBMIT_SELECTORS);
        passwordField = await this.waitForPasswordOrCode(page);
      }

      if (passwordField) {
        if (!password) {
          return {
            status: "failed",
            message: "Este portal pediu a senha da conta.",
          };
        }
        await passwordField.fill(password);
        await humanPause(500);
        await clickFirstVisible(page, SUBMIT_SELECTORS);
      }

      const result = await this.settle(page, portalKey);
      if (result.status === "awaiting_code") {
        keepOpen = true;
        this.keepPending(loginKey, portalKey, context, page);
      }
      if (result.status === "connected") {
        return {
          status: "connected",
          storageState: JSON.stringify(await context.storageState()),
        };
      }
      return result;
    } catch (error) {
      this.logger.warn(`Sign in to ${portalKey} failed: ${String(error)}`);
      return {
        status: "failed",
        message: "O portal não respondeu, tente de novo em instantes.",
      };
    } finally {
      if (!keepOpen) await this.browserService.release(context);
    }
  }

  async submitCode(loginKey: string, code: string): Promise<SignInResult> {
    const pending = this.pending.get(loginKey);
    if (!pending) {
      return {
        status: "failed",
        message: "O tempo para digitar o código acabou. Conecte de novo.",
      };
    }
    clearTimeout(pending.timer);
    this.pending.delete(loginKey);
    const { page, context, portal } = pending;
    let keepOpen = false;

    try {
      const digits = code.replace(/\s/g, "");
      const boxes = page.locator("input[maxlength='1']");
      const boxCount = await boxes.count().catch(() => 0);
      if (boxCount >= digits.length && boxCount <= 8) {
        for (let index = 0; index < digits.length; index += 1) {
          await boxes.nth(index).fill(digits[index]);
        }
      } else {
        const field = await firstVisible(page, CODE_SELECTORS);
        if (!field) {
          return {
            status: "failed",
            message: "O portal fechou a tela do código. Conecte de novo.",
          };
        }
        await field.fill(digits);
      }
      await humanPause(500);
      await clickFirstVisible(page, SUBMIT_SELECTORS);

      const result = await this.settle(page, portal);
      if (result.status === "awaiting_code") {
        keepOpen = true;
        this.keepPending(loginKey, portal, context, page);
        return {
          status: "awaiting_code",
          message: "O portal não aceitou o código. Confira e digite de novo.",
        };
      }
      if (result.status === "connected") {
        return {
          status: "connected",
          storageState: JSON.stringify(await context.storageState()),
        };
      }
      return result;
    } catch (error) {
      this.logger.warn(`Code for ${portal} failed: ${String(error)}`);
      return {
        status: "failed",
        message: "O portal não respondeu, tente de novo em instantes.",
      };
    } finally {
      if (!keepOpen) await this.browserService.release(context);
    }
  }

  async discardPending(loginKey: string) {
    const pending = this.pending.get(loginKey);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(loginKey);
    await this.browserService.release(pending.context);
  }

  async onApplicationShutdown() {
    await Promise.all(
      [...this.pending.keys()].map((key) => this.discardPending(key)),
    );
  }

  /** Waits for the page to land and tells where the login ended up. */
  private async settle(
    page: Page,
    portalKey: PortalKey,
  ): Promise<
    { status: "connected" } | Exclude<SignInResult, { status: "connected" }>
  > {
    await page
      .waitForLoadState("networkidle", { timeout: 15_000 })
      .catch(() => undefined);
    await pause(2000);

    if (await firstVisible(page, CODE_SELECTORS)) {
      return {
        status: "awaiting_code",
        message:
          "O portal mandou um código para o seu e-mail ou celular. Digite aqui para terminar.",
      };
    }
    if (await isChallenge(page)) return challengeFailure();

    const text = await page
      .locator("body")
      .innerText({ timeout: 3000 })
      .catch(() => "");
    if (
      REJECTED_TEXT.test(text) ||
      (await firstVisible(page, PASSWORD_SELECTORS))
    ) {
      return {
        status: "failed",
        message:
          "O portal recusou o e-mail ou a senha. Confira e tente de novo.",
      };
    }

    const loginUrl = new URL(PORTALS[portalKey].loginUrl);
    const current = new URL(page.url());
    const stillOnLogin =
      current.hostname === loginUrl.hostname &&
      current.pathname.replace(/\/$/, "") ===
        loginUrl.pathname.replace(/\/$/, "");
    if (stillOnLogin && (await firstVisible(page, EMAIL_SELECTORS))) {
      return {
        status: "failed",
        message: "O portal não terminou o login. Tente de novo em instantes.",
      };
    }
    return { status: "connected" };
  }

  private async waitForPasswordOrCode(page: Page) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await pause(1000);
      const password = await firstVisible(page, PASSWORD_SELECTORS);
      if (password) return password;
      if (await firstVisible(page, CODE_SELECTORS)) return null;
    }
    return null;
  }

  private keepPending(
    loginKey: string,
    portal: PortalKey,
    context: BrowserContext,
    page: Page,
  ) {
    const timer = setTimeout(
      () => void this.discardPending(loginKey),
      CODE_WAIT_MILLISECONDS,
    );
    this.pending.set(loginKey, { portal, context, page, timer });
  }
}

const challengeFailure = (): SignInResult => ({
  status: "failed",
  message:
    "O portal pediu uma verificação de segurança (captcha). Tente de novo mais tarde.",
});
