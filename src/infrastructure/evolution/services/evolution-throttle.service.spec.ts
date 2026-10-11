import type { ConfigType } from "@nestjs/config";
import { evolutionConfig } from "../../../config/evolution.config";
import {
  EvolutionThrottleService,
  WhatsappSafetyLimitException,
} from "./evolution-throttle.service";

type Safety = ConfigType<typeof evolutionConfig>["safety"];

/** No pauses, so the limits can be checked without waiting. */
const fastSafety: Safety = {
  chatSwitchDelayMinimumMilliseconds: 0,
  chatSwitchDelayMaximumMilliseconds: 0,
  sameChatDelayMinimumMilliseconds: 0,
  sameChatDelayMaximumMilliseconds: 0,
  typingMinimumMilliseconds: 800,
  typingMaximumMilliseconds: 4_000,
  messagesPerMinute: 0,
  messagesPerHour: 0,
  messagesPerDay: 0,
  newChatsPerHour: 0,
  newChatsPerDay: 0,
  sameTextChatsPerDay: 0,
  warmUpHours: 48,
  warmUpFactor: 0.5,
  maximumQueuedMessages: 0,
  failuresBeforePause: 0,
  pauseMilliseconds: 0,
  lookupsPerHour: 0,
  lookupDelayMinimumMilliseconds: 0,
  lookupDelayMaximumMilliseconds: 0,
  connectAttemptsPerWindow: 0,
};

const createService = (overrides: Partial<Safety>) =>
  new EvolutionThrottleService({
    url: "",
    apiKey: "",
    webhookBaseUrl: "",
    instancePrefix: "test",
    safety: { ...fastSafety, ...overrides },
  });

const instanceName = "test-instance";
const longText = "Olá, tenho um apartamento novo que combina com você!";

describe("EvolutionThrottleService", () => {
  it("sends one message at a time, in the order they were asked", async () => {
    const service = createService({});
    const order: string[] = [];
    let running = 0;
    let maximumRunning = 0;

    const send = (label: string) =>
      service.scheduleSend(
        instanceName,
        { chat: "5511999990000" },
        async () => {
          running++;
          maximumRunning = Math.max(maximumRunning, running);
          await new Promise((resolve) => setTimeout(resolve, 5));
          order.push(label);
          running--;
        },
      );

    await Promise.all([send("first"), send("second"), send("third")]);

    expect(order).toEqual(["first", "second", "third"]);
    expect(maximumRunning).toBe(1);
  });

  it("refuses past the hourly limit", async () => {
    const service = createService({ messagesPerHour: 2 });
    const send = () =>
      service.scheduleSend(instanceName, { chat: "5511999990000" }, () =>
        Promise.resolve("sent"),
      );

    await send();
    await send();
    await expect(send()).rejects.toBeInstanceOf(WhatsappSafetyLimitException);
  });

  it("halves the limits while the number warms up", async () => {
    const service = createService({ messagesPerHour: 4 });
    const send = () =>
      service.scheduleSend(
        instanceName,
        { chat: "5511999990000", connectedAt: new Date() },
        () => Promise.resolve("sent"),
      );

    await send();
    await send();
    await expect(send()).rejects.toBeInstanceOf(WhatsappSafetyLimitException);
  });

  it("limits new chats but keeps talking to the ones already opened", async () => {
    const service = createService({ newChatsPerDay: 1 });
    const send = (chat: string) =>
      service.scheduleSend(instanceName, { chat, firstContact: true }, () =>
        Promise.resolve("sent"),
      );

    await send("5511999990001");
    await send("5511999990001");
    await expect(send("5511999990002")).rejects.toBeInstanceOf(
      WhatsappSafetyLimitException,
    );
  });

  it("refuses the same text to too many chats", async () => {
    const service = createService({ sameTextChatsPerDay: 2 });
    const send = (chat: string, text: string) =>
      service.scheduleSend(instanceName, { chat, text }, () =>
        Promise.resolve("sent"),
      );

    await send("5511999990001", longText);
    await send("5511999990002", longText.toUpperCase());
    await expect(send("5511999990003", longText)).rejects.toBeInstanceOf(
      WhatsappSafetyLimitException,
    );
    await expect(send("5511999990003", "Bom dia")).resolves.toBe("sent");
  });

  it("asks for a typing time that grows with the text", async () => {
    const service = createService({});
    const typingOf = (text: string) =>
      service.scheduleSend(
        instanceName,
        { chat: "5511999990000", text },
        (typingMilliseconds) => Promise.resolve(typingMilliseconds),
      );

    const short = await typingOf("Oi");
    const long = await typingOf(longText.repeat(3));

    expect(short).toBeGreaterThanOrEqual(800 * 0.85);
    expect(long).toBeGreaterThan(short);
    expect(long).toBeLessThanOrEqual(4_000 * 1.15);
  });

  it("pauses the number after failures in a row", async () => {
    const service = createService({
      failuresBeforePause: 2,
      pauseMilliseconds: 300,
    });
    const fail = () =>
      service.scheduleSend(instanceName, { chat: "5511999990000" }, () =>
        Promise.reject(new Error("refused")),
      );

    await expect(fail()).rejects.toThrow("refused");
    await expect(fail()).rejects.toThrow("refused");

    const startedAt = Date.now();
    await service.scheduleSend(instanceName, { chat: "5511999990000" }, () =>
      Promise.resolve("sent"),
    );
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(250);
  });

  it("limits pairing attempts", () => {
    const service = createService({ connectAttemptsPerWindow: 2 });

    service.assertConnectAttempt(instanceName);
    service.assertConnectAttempt(instanceName);
    expect(() => service.assertConnectAttempt(instanceName)).toThrow(
      WhatsappSafetyLimitException,
    );
  });
});
