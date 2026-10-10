import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtStrategy } from "./jwt.strategy";
import { EmailWhitelistService } from "../services/email-whitelist.service";
import { UserRepository } from "../../users/repositories/user.repository";

const configValues: Record<string, unknown> = {
  "jwt.secret": "jwt-secret",
  "auth.emailWhitelist": "owner@gmail.com",
};

describe("JwtStrategy", () => {
  const userRepository = { findOneBy: jest.fn() };

  let jwtStrategy: JwtStrategy;

  beforeEach(() => {
    jest.resetAllMocks();

    const configService = {
      get: jest.fn((key: string) => configValues[key]),
    } as unknown as ConfigService;

    jwtStrategy = new JwtStrategy(
      configService,
      userRepository as unknown as UserRepository,
      new EmailWhitelistService(configService),
    );
  });

  it("accepts a token from a whitelisted user", async () => {
    const user = { id: "user-id", email: "Owner@Gmail.com" };
    userRepository.findOneBy.mockResolvedValue(user);

    await expect(
      jwtStrategy.validate({ id: "user-id", email: "owner@gmail.com" }),
    ).resolves.toBe(user);
  });

  it("rejects a still valid token once the user email left the whitelist", async () => {
    userRepository.findOneBy.mockResolvedValue({
      id: "user-id",
      email: "removed@gmail.com",
    });

    await expect(
      jwtStrategy.validate({ id: "user-id", email: "removed@gmail.com" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects a token from an unknown user", async () => {
    userRepository.findOneBy.mockResolvedValue(null);

    await expect(
      jwtStrategy.validate({ id: "missing-id", email: "owner@gmail.com" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
