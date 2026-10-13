import {
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { createHash } from "crypto";
import { evolutionConfig } from "../../../config/evolution.config";

const MINUTE_MILLISECONDS = 60 * 1000;
const HOUR_MILLISECONDS = 60 * MINUTE_MILLISECONDS;
const DAY_MILLISECONDS = 24 * HOUR_MILLISECONDS;
const CONNECT_WINDOW_MILLISECONDS = 15 * MINUTE_MILLISECONDS;

/** How long a queued message waits for a dropped connection to come back. */
const RECONNECT_WAIT_MILLISECONDS = 60 * 1000;
const RECONNECT_POLL_MILLISECONDS = 2 * 1000;

/** Typing speed used to size the "typing..." shown before a text. */
const TYPING_MILLISECONDS_PER_CHARACTER = 35;

/** Shorter texts ("bom dia", "ok") repeat naturally and are not checked. */
const SAME_TEXT_MINIMUM_LENGTH = 20;

type SafetyConfiguration = ConfigType<typeof evolutionConfig>["safety"];

/** What the queue needs to know about a send to judge its risk. */
export interface SendContext {
  /** The chat never wrote to the broker, WhatsApp watches these closely. */
  firstContact?: boolean;
  /** When the number was linked, a fresh link sends less. */
  connectedAt?: Date | null;
}

interface SendRequest extends SendContext {
  /** The number receiving the message. */
  chat: string;
  /** The text, or the caption of a media, used for the typing time and the repeated text check. */
  text?: string | null;
}

/** A send refused to protect the number from a WhatsApp ban. */
export class WhatsappSafetyLimitException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}

/** Runs tasks with a concurrency limit and a random pause between starts. */
class Lane {
  private active = 0;
  private readonly waiting: (() => void)[] = [];
  private nextStartAt = 0;

  constructor(
    private readonly concurrency: number,
    private readonly minimumGapMilliseconds: number,
    private readonly maximumGapMilliseconds: number,
  ) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      const now = Date.now();
      const startAt = Math.max(now, this.nextStartAt);
      this.nextStartAt =
        startAt +
        randomBetween(this.minimumGapMilliseconds, this.maximumGapMilliseconds);
      if (startAt > now) await sleep(startAt - now);
      return await task();
    } finally {
      this.release();
    }
  }

  private async acquire() {
    if (this.active < this.concurrency) {
      this.active++;
      return;
    }
    await new Promise<void>((resolve) => this.waiting.push(resolve));
  }

  private release() {
    const next = this.waiting.shift();
    if (next) next();
    else this.active--;
  }
}

interface InstanceState {
  sendTail: Promise<void>;
  queuedSends: number;
  lastSendAt: number;
  lastChat: string | null;
  /** Start of every send attempt in the last day. */
  sends: number[];
  /** First send to each chat that never wrote to the broker, in the last day. */
  newChats: Map<string, number>;
  /** Chats that got each text, by fingerprint, in the last day. */
  textChats: Map<string, Map<string, number>>;
  consecutiveFailures: number;
  pausedUntil: number;
  /** The phone is not connected, sends wait for it. */
  suspended: boolean;
  lookups: number[];
  connectAttempts: number[];
  lookupLane: Lane;
  receiptLane: Lane;
  mediaLane: Lane;
  readLane: Lane;
}

/**
 * The single door to WhatsApp for each number. Sends go one at a time with
 * human pauses and a "typing..." before them, inside hourly and daily limits,
 * and the number pauses by itself when WhatsApp starts refusing. Everything
 * lives in memory, so the counters start over when the server restarts.
 */
@Injectable()
export class EvolutionThrottleService {
  private readonly logger = new Logger(EvolutionThrottleService.name);
  private readonly states = new Map<string, InstanceState>();
  private readonly safety: SafetyConfiguration;

  constructor(
    @Inject(evolutionConfig.KEY)
    configuration: ConfigType<typeof evolutionConfig>,
  ) {
    this.safety = configuration.safety;
  }

  /**
   * Queues a message of the number. The send receives how long WhatsApp
   * should show "typing..." before the message goes.
   */
  async scheduleSend<T>(
    instanceName: string,
    request: SendRequest,
    send: (typingMilliseconds: number) => Promise<T>,
  ): Promise<T> {
    const state = this.stateOf(instanceName);

    if (
      this.safety.maximumQueuedMessages &&
      state.queuedSends >= this.safety.maximumQueuedMessages
    ) {
      throw new WhatsappSafetyLimitException(
        "Muitas mensagens na fila de envio. Espere as anteriores saírem e tente de novo.",
      );
    }
    this.assertSendAllowed(state, request, state.queuedSends);

    state.queuedSends++;
    const run = state.sendTail.then(() => this.runSend(state, request, send));
    state.sendTail = run.then(noop, noop);
    try {
      return await run;
    } finally {
      state.queuedSends--;
    }
  }

  /** Questions about other numbers, such as profile pictures and read receipts. */
  async scheduleLookup<T>(instanceName: string, task: () => Promise<T>) {
    const state = this.stateOf(instanceName);
    if (state.suspended) {
      throw new ConflictException("O WhatsApp está desconectado.");
    }

    const now = Date.now();
    prune(state.lookups, now - HOUR_MILLISECONDS);
    if (
      this.safety.lookupsPerHour &&
      state.lookups.length >= this.safety.lookupsPerHour
    ) {
      throw new WhatsappSafetyLimitException(
        "Limite de consultas ao WhatsApp nesta hora atingido.",
      );
    }
    state.lookups.push(now);
    return state.lookupLane.run(task);
  }

  /**
   * Read receipts, which any WhatsApp app sends all the time. They get their
   * own lane, so a queue of profile pictures never holds them back.
   */
  async scheduleReceipt<T>(instanceName: string, task: () => Promise<T>) {
    const state = this.stateOf(instanceName);
    if (state.suspended) {
      throw new ConflictException("O WhatsApp está desconectado.");
    }
    return state.receiptLane.run(task);
  }

  /** Media downloads, a few at a time so a history import does not burst. */
  scheduleMedia<T>(instanceName: string, task: () => Promise<T>) {
    return this.stateOf(instanceName).mediaLane.run(task);
  }

  /** Reads of what Evolution already stored, a few at a time to spare the server. */
  scheduleRead<T>(instanceName: string, task: () => Promise<T>) {
    return this.stateOf(instanceName).readLane.run(task);
  }

  /** Too many QR codes in a row look like an account being taken over. */
  assertConnectAttempt(instanceName: string) {
    const state = this.stateOf(instanceName);
    const now = Date.now();
    prune(state.connectAttempts, now - CONNECT_WINDOW_MILLISECONDS);
    if (
      this.safety.connectAttemptsPerWindow &&
      state.connectAttempts.length >= this.safety.connectAttemptsPerWindow
    ) {
      const minutes = minutesUntil(
        state.connectAttempts[0] + CONNECT_WINDOW_MILLISECONDS,
        now,
      );
      throw new WhatsappSafetyLimitException(
        `Muitas tentativas de conexão seguidas. Para proteger o seu número, espere ${minutes} min e tente de novo.`,
      );
    }
    state.connectAttempts.push(now);
  }

  /** The phone dropped: queued messages wait for it instead of failing on WhatsApp. */
  suspend(instanceName: string) {
    this.stateOf(instanceName).suspended = true;
  }

  resume(instanceName: string) {
    const state = this.stateOf(instanceName);
    state.suspended = false;
    state.consecutiveFailures = 0;
  }

  private async runSend<T>(
    state: InstanceState,
    request: SendRequest,
    send: (typingMilliseconds: number) => Promise<T>,
  ) {
    await this.waitForConnection(state);
    await this.waitForPause(state);
    this.assertSendAllowed(state, request, 0);
    await this.waitForMinuteWindow(state);
    await this.waitForGap(state, request.chat);

    const startedAt = Date.now();
    this.recordAttempt(state, request, startedAt);

    try {
      const result = await send(this.typingFor(request.text));
      state.consecutiveFailures = 0;
      return result;
    } catch (error) {
      this.registerFailure(state);
      throw error;
    } finally {
      state.lastSendAt = Date.now();
      state.lastChat = request.chat;
    }
  }

  /** Hard limits: past them the message fails now instead of waiting hours. */
  private assertSendAllowed(
    state: InstanceState,
    request: SendRequest,
    alreadyQueued: number,
  ) {
    const now = Date.now();
    this.pruneSends(state, now);

    const perHour = this.limitFor(this.safety.messagesPerHour, request);
    const sentLastHour = countSince(state.sends, now - HOUR_MILLISECONDS);
    if (perHour && sentLastHour + alreadyQueued >= perHour) {
      throw new WhatsappSafetyLimitException(
        `Limite de segurança: ${perHour} mensagens por hora neste número. ${this.retryHint(state.sends, HOUR_MILLISECONDS, now)}`,
      );
    }

    const perDay = this.limitFor(this.safety.messagesPerDay, request);
    if (perDay && state.sends.length + alreadyQueued >= perDay) {
      throw new WhatsappSafetyLimitException(
        `Limite de segurança: ${perDay} mensagens por dia neste número. ${this.retryHint(state.sends, DAY_MILLISECONDS, now)}`,
      );
    }

    if (request.firstContact && !state.newChats.has(request.chat)) {
      const firstSends = [...state.newChats.values()].sort((a, b) => a - b);
      const newPerHour = this.limitFor(this.safety.newChatsPerHour, request);
      if (
        newPerHour &&
        countSince(firstSends, now - HOUR_MILLISECONDS) >= newPerHour
      ) {
        throw new WhatsappSafetyLimitException(
          `Limite de segurança: no máximo ${newPerHour} contatos novos por hora. O WhatsApp bane números que puxam conversa com muita gente que nunca respondeu. ${this.retryHint(firstSends, HOUR_MILLISECONDS, now)}`,
        );
      }
      const newPerDay = this.limitFor(this.safety.newChatsPerDay, request);
      if (newPerDay && firstSends.length >= newPerDay) {
        throw new WhatsappSafetyLimitException(
          `Limite de segurança: no máximo ${newPerDay} contatos novos por dia. O WhatsApp bane números que puxam conversa com muita gente que nunca respondeu. ${this.retryHint(firstSends, DAY_MILLISECONDS, now)}`,
        );
      }
    }

    const fingerprint = fingerprintOf(request.text);
    if (fingerprint && this.safety.sameTextChatsPerDay) {
      const chats = state.textChats.get(fingerprint);
      if (
        chats &&
        !chats.has(request.chat) &&
        chats.size >= this.safety.sameTextChatsPerDay
      ) {
        throw new WhatsappSafetyLimitException(
          `Esse mesmo texto já foi para ${chats.size} conversas hoje. Personalize a mensagem para não parecer disparo em massa, o WhatsApp bane números assim.`,
        );
      }
    }
  }

  private recordAttempt(
    state: InstanceState,
    request: SendRequest,
    at: number,
  ) {
    state.sends.push(at);
    if (request.firstContact && !state.newChats.has(request.chat)) {
      state.newChats.set(request.chat, at);
    }
    const fingerprint = fingerprintOf(request.text);
    if (fingerprint) {
      const chats =
        state.textChats.get(fingerprint) ?? new Map<string, number>();
      chats.set(request.chat, at);
      state.textChats.set(fingerprint, chats);
    }
  }

  /** WhatsApp refusing in a row is the warning before a ban: the number rests. */
  private registerFailure(state: InstanceState) {
    state.consecutiveFailures++;
    if (
      !this.safety.failuresBeforePause ||
      state.consecutiveFailures < this.safety.failuresBeforePause
    ) {
      return;
    }
    state.consecutiveFailures = 0;
    state.pausedUntil = Date.now() + this.safety.pauseMilliseconds;
    this.logger.warn(
      `Sends paused for ${Math.round(this.safety.pauseMilliseconds / 1000)}s after ${this.safety.failuresBeforePause} failures in a row`,
    );
  }

  private async waitForConnection(state: InstanceState) {
    const deadline = Date.now() + RECONNECT_WAIT_MILLISECONDS;
    while (state.suspended) {
      if (Date.now() >= deadline) {
        throw new ConflictException(
          "O WhatsApp está desconectado. Conecte de novo para enviar.",
        );
      }
      await sleep(RECONNECT_POLL_MILLISECONDS);
    }
  }

  private async waitForPause(state: InstanceState) {
    const wait = state.pausedUntil - Date.now();
    if (wait > 0) await sleep(wait);
  }

  private async waitForMinuteWindow(state: InstanceState) {
    const perMinute = this.safety.messagesPerMinute;
    if (!perMinute) return;
    for (;;) {
      const now = Date.now();
      const lastMinute = state.sends.filter(
        (at) => at > now - MINUTE_MILLISECONDS,
      );
      if (lastMinute.length < perMinute) return;
      await sleep(lastMinute[0] + MINUTE_MILLISECONDS - now + 50);
    }
  }

  private async waitForGap(state: InstanceState, chat: string) {
    if (!state.lastSendAt) return;
    const sameChat = state.lastChat === chat;
    const gap = sameChat
      ? randomBetween(
          this.safety.sameChatDelayMinimumMilliseconds,
          this.safety.sameChatDelayMaximumMilliseconds,
        )
      : randomBetween(
          this.safety.chatSwitchDelayMinimumMilliseconds,
          this.safety.chatSwitchDelayMaximumMilliseconds,
        );
    const wait = state.lastSendAt + gap - Date.now();
    if (wait > 0) await sleep(wait);
  }

  /** As long as a person would take to type the text, a short pause for media. */
  private typingFor(text: string | null | undefined) {
    const minimum = this.safety.typingMinimumMilliseconds;
    const maximum = Math.max(minimum, this.safety.typingMaximumMilliseconds);
    const length = text?.trim().length ?? 0;
    if (!length) return randomBetween(minimum, Math.min(maximum, minimum * 2));
    const typing = length * TYPING_MILLISECONDS_PER_CHARACTER;
    return Math.round(
      Math.min(maximum, Math.max(minimum, typing)) * randomBetween(0.85, 1.15),
    );
  }

  /** Limits shrink while the number was linked only recently. A zero limit is off. */
  private limitFor(base: number, request: SendRequest) {
    if (!base) return 0;
    const connectedAt = request.connectedAt?.getTime();
    const warmingUp =
      connectedAt !== undefined &&
      Date.now() - connectedAt < this.safety.warmUpHours * HOUR_MILLISECONDS;
    return warmingUp
      ? Math.max(1, Math.floor(base * this.safety.warmUpFactor))
      : base;
  }

  private retryHint(stamps: number[], span: number, now: number) {
    const oldest = stamps.find((at) => at > now - span);
    if (oldest === undefined) return "Tente de novo mais tarde.";
    const minutes = minutesUntil(oldest + span, now);
    return minutes >= 120
      ? `Tente de novo em ${Math.ceil(minutes / 60)} h.`
      : `Tente de novo em ${minutes} min.`;
  }

  private pruneSends(state: InstanceState, now: number) {
    const dayAgo = now - DAY_MILLISECONDS;
    prune(state.sends, dayAgo);
    for (const [chat, at] of state.newChats) {
      if (at <= dayAgo) state.newChats.delete(chat);
    }
    for (const [fingerprint, chats] of state.textChats) {
      for (const [chat, at] of chats) {
        if (at <= dayAgo) chats.delete(chat);
      }
      if (!chats.size) state.textChats.delete(fingerprint);
    }
  }

  private stateOf(instanceName: string) {
    let state = this.states.get(instanceName);
    if (!state) {
      state = {
        sendTail: Promise.resolve(),
        queuedSends: 0,
        lastSendAt: 0,
        lastChat: null,
        sends: [],
        newChats: new Map(),
        textChats: new Map(),
        consecutiveFailures: 0,
        pausedUntil: 0,
        suspended: false,
        lookups: [],
        connectAttempts: [],
        lookupLane: new Lane(
          1,
          this.safety.lookupDelayMinimumMilliseconds,
          this.safety.lookupDelayMaximumMilliseconds,
        ),
        receiptLane: new Lane(1, 300, 800),
        mediaLane: new Lane(2, 300, 800),
        readLane: new Lane(3, 0, 0),
      };
      this.states.set(instanceName, state);
    }
    return state;
  }
}

const noop = () => undefined;

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const randomBetween = (minimum: number, maximum: number) =>
  maximum <= minimum ? minimum : minimum + Math.random() * (maximum - minimum);

/** Drops the timestamps, kept oldest first, that are not after the limit. */
const prune = (stamps: number[], limit: number) => {
  while (stamps.length && stamps[0] <= limit) stamps.shift();
};

const countSince = (stamps: number[], limit: number) =>
  stamps.filter((at) => at > limit).length;

const minutesUntil = (at: number, now: number) =>
  Math.max(1, Math.ceil((at - now) / MINUTE_MILLISECONDS));

/** Same words in any case or spacing count as the same text. */
const fingerprintOf = (text: string | null | undefined) => {
  const normalized = (text ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  if (normalized.length < SAME_TEXT_MINIMUM_LENGTH) return null;
  return createHash("sha1").update(normalized).digest("hex");
};
