import { ConfigService } from "@nestjs/config";
import { Repository } from "typeorm";
import { User } from "../../users/entities/user.entity";
import { RefreshSession } from "../entities/refresh-session.entity";
import { RefreshSessionService } from "./refresh-session.service";

const MILLISECONDS_PER_DAY = 86_400_000;

/** Enough of a repository to keep the sessions in memory. */
const buildService = () => {
  const sessions = new Map<string, RefreshSession>();
  let nextIdentifier = 0;
  const matches = (session: RefreshSession, where: Partial<RefreshSession>) =>
    Object.entries(where).every(
      ([key, value]) => session[key as keyof RefreshSession] === value,
    );

  const repository = {
    create: (fields: Partial<RefreshSession>) => ({ ...fields }),
    save: (session: RefreshSession) => {
      nextIdentifier += 1;
      const saved = {
        ...session,
        id: `00000000-0000-4000-8000-${String(nextIdentifier).padStart(12, "0")}`,
        active: true,
      } as RefreshSession;
      sessions.set(saved.id, saved);
      return Promise.resolve({ ...saved });
    },
    findOneBy: (where: Partial<RefreshSession>) => {
      const found = [...sessions.values()].find((session) =>
        matches(session, where),
      );
      return Promise.resolve(found ? { ...found } : null);
    },
    update: (
      where: Partial<RefreshSession>,
      fields: Partial<RefreshSession>,
    ) => {
      let affected = 0;
      for (const session of sessions.values()) {
        if (!matches(session, where)) continue;
        Object.assign(session, fields);
        affected += 1;
      }
      return Promise.resolve({ affected });
    },
    delete: (where: Partial<RefreshSession>) => {
      for (const session of [...sessions.values()]) {
        if (matches(session, where)) sessions.delete(session.id);
      }
      return Promise.resolve({});
    },
    createQueryBuilder: () => {
      const builder = {
        delete: () => builder,
        where: () => builder,
        execute: () => Promise.resolve({}),
      };
      return builder;
    },
  };

  const settings: Record<string, unknown> = {
    "auth.jwtRefreshSecret": "refresh test secret",
    "auth.refreshSessionIdleDays": 60,
    "auth.refreshSessionMaximumDays": 365,
  };
  const service = new RefreshSessionService(
    repository as unknown as Repository<RefreshSession>,
    { get: (key: string) => settings[key] } as unknown as ConfigService,
  );
  return { service, sessions };
};

const user = { id: "u1", tokenVersion: 4 } as User;

describe("RefreshSessionService", () => {
  afterEach(() => jest.useRealTimers());

  it("rotates the token on every refresh and keeps the user's version", async () => {
    const { service } = buildService();
    const first = await service.open(user);

    const second = await service.rotate(first);
    expect(second).toMatchObject({ userId: "u1", tokenVersion: 4 });
    expect(second?.refreshToken).not.toBe(first);

    const third = await service.rotate(second!.refreshToken);
    expect(third?.refreshToken).not.toBe(second?.refreshToken);
  });

  it("slides the idle deadline forward on every refresh", async () => {
    jest.useFakeTimers({ now: new Date("2026-01-01T00:00:00Z") });
    const { service, sessions } = buildService();
    let token = await service.open(user);

    // Used every 50 days, past the old fixed lifetime and the 60 idle days.
    for (let round = 0; round < 6; round += 1) {
      jest.setSystemTime(Date.now() + 50 * MILLISECONDS_PER_DAY);
      const rotated = await service.rotate(token);
      expect(rotated).not.toBeNull();
      token = rotated!.refreshToken;
    }

    const [session] = [...sessions.values()];
    expect(session.idleExpiresAt.getTime()).toBeLessThanOrEqual(
      session.absoluteExpiresAt.getTime(),
    );
  });

  it("ends a session left unused for longer than the idle days", async () => {
    jest.useFakeTimers({ now: new Date("2026-01-01T00:00:00Z") });
    const { service } = buildService();
    const token = await service.open(user);

    jest.setSystemTime(Date.now() + 61 * MILLISECONDS_PER_DAY);
    await expect(service.rotate(token)).resolves.toBeNull();
  });

  it("ends a session at the maximum days however often it is used", async () => {
    jest.useFakeTimers({ now: new Date("2026-01-01T00:00:00Z") });
    const { service } = buildService();
    let token = await service.open(user);

    for (let day = 30; day < 365; day += 30) {
      jest.setSystemTime(
        new Date("2026-01-01T00:00:00Z").getTime() + day * MILLISECONDS_PER_DAY,
      );
      token = (await service.rotate(token))!.refreshToken;
    }

    jest.setSystemTime(
      new Date("2026-01-01T00:00:00Z").getTime() + 366 * MILLISECONDS_PER_DAY,
    );
    await expect(service.rotate(token)).resolves.toBeNull();
  });

  it("answers a just replaced token with the same successor", async () => {
    const { service } = buildService();
    const first = await service.open(user);

    const winner = await service.rotate(first);
    const lateTab = await service.rotate(first);
    expect(lateTab?.refreshToken).toBe(winner?.refreshToken);

    // The successor both tabs stored keeps working.
    await expect(service.rotate(winner!.refreshToken)).resolves.not.toBeNull();
  });

  it("revokes the session when a replaced token comes back after the grace", async () => {
    jest.useFakeTimers({ now: new Date("2026-01-01T00:00:00Z") });
    const { service } = buildService();
    const stolen = await service.open(user);
    const legitimate = await service.rotate(stolen);

    jest.setSystemTime(Date.now() + 10 * 60_000);
    await expect(service.rotate(stolen)).resolves.toBeNull();
    // The holder of the current token is signed out too.
    await expect(service.rotate(legitimate!.refreshToken)).resolves.toBeNull();
  });

  it("refuses forged, tampered and malformed tokens", async () => {
    const { service } = buildService();
    const token = await service.open(user);
    const [prefix, sessionId, generation, signature] = token.split(".");

    const flippedEnding = signature.endsWith("A") ? "B" : "A";
    const tampered = [
      prefix,
      sessionId,
      generation,
      `${signature.slice(0, -1)}${flippedEnding}`,
    ].join(".");
    const otherGeneration = [prefix, sessionId, "7", signature].join(".");
    await expect(service.rotate(tampered)).resolves.toBeNull();
    await expect(service.rotate(otherGeneration)).resolves.toBeNull();
    await expect(service.rotate("rt1.not-a-session.0.abc")).resolves.toBeNull();
    await expect(service.rotate("")).resolves.toBeNull();

    // None of these revoked the real session.
    await expect(service.rotate(token)).resolves.not.toBeNull();
  });

  it("does not let one user's token open another user's session", async () => {
    const { service } = buildService();
    const firstToken = await service.open(user);
    const secondToken = await service.open({
      id: "u2",
      tokenVersion: 0,
    } as User);

    const [, firstSessionId] = firstToken.split(".");
    const [prefix, , generation, secondSignature] = secondToken.split(".");
    const swapped = [prefix, firstSessionId, generation, secondSignature].join(
      ".",
    );

    await expect(service.rotate(swapped)).resolves.toBeNull();
    await expect(service.rotate(secondToken)).resolves.toMatchObject({
      userId: "u2",
    });
  });

  it("closes every session of the user on logout", async () => {
    const { service } = buildService();
    const phone = await service.open(user);
    const laptop = await service.open(user);

    await service.closeAll("u1");
    await expect(service.rotate(phone)).resolves.toBeNull();
    await expect(service.rotate(laptop)).resolves.toBeNull();
  });
});
