import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserRepository } from "../../users/repositories/user.repository";
import { JwtStrategy } from "./jwt.strategy";

const buildStrategy = (user: { id: string; tokenVersion: number } | null) => {
  const findOneBy = jest.fn().mockResolvedValue(user);
  const strategy = new JwtStrategy(
    { get: () => "test secret" } as unknown as ConfigService,
    { findOneBy } as unknown as UserRepository,
  );
  return { strategy, findOneBy };
};

describe("JwtStrategy.validate", () => {
  it("accepts a token of the current session version", async () => {
    const { strategy } = buildStrategy({ id: "u1", tokenVersion: 2 });
    await expect(
      strategy.validate({ id: "u1", email: "a@b.c", typ: "access", ver: 2 }),
    ).resolves.toEqual({ id: "u1", tokenVersion: 2 });
  });

  it("refuses every token issued before a logout", async () => {
    const { strategy } = buildStrategy({ id: "u1", tokenVersion: 3 });
    await expect(
      strategy.validate({ id: "u1", email: "a@b.c", typ: "access", ver: 2 }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("only looks up active accounts, so a deleted one is refused", async () => {
    const { strategy, findOneBy } = buildStrategy(null);
    await expect(
      strategy.validate({ id: "u1", email: "a@b.c", typ: "access", ver: 0 }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(findOneBy).toHaveBeenCalledWith({ id: "u1", active: true });
  });

  it("refuses a refresh token used as an access token", async () => {
    const { strategy } = buildStrategy({ id: "u1", tokenVersion: 0 });
    await expect(
      strategy.validate({ id: "u1", email: "a@b.c", typ: "refresh" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
