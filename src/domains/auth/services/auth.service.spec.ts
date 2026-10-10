import {
  ForbiddenException,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import { AuthService } from "./auth.service";
import { EmailWhitelistService } from "./email-whitelist.service";
import { UserRepository } from "../../users/repositories/user.repository";
import { Kanban } from "../../kanbans/entities/kanban.entity";

const configValues: Record<string, unknown> = {
  "auth.googleClientId": "google-client-id",
  "auth.jwtRefreshSecret": "refresh-secret",
  "auth.jwtExpirationTime": 3600,
  "auth.jwtRefreshExpirationTime": 604800,
  "auth.emailWhitelist": "Owner@Gmail.com, agent@gmail.com",
};

const buildGooglePayload = (overrides: Record<string, unknown> = {}) => ({
  sub: "google-subject",
  name: "Some Person",
  email: "owner@gmail.com",
  email_verified: true,
  ...overrides,
});

describe("AuthService", () => {
  const userRepository = {
    findByEmail: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
  };
  const kanbanRepository = { save: jest.fn() };
  const jwtService = { sign: jest.fn(), verify: jest.fn() };
  const verifyIdToken = jest.fn();

  let authService: AuthService;
  let warnSpy: jest.SpyInstance;

  const mockGooglePayload = (payload: Record<string, unknown>): void => {
    verifyIdToken.mockResolvedValue({ getPayload: () => payload });
  };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation();
    jwtService.sign.mockReturnValue("signed-token");

    const configService = {
      get: jest.fn((key: string) => configValues[key]),
    } as unknown as ConfigService;

    authService = new AuthService(
      configService,
      userRepository as unknown as UserRepository,
      jwtService as unknown as JwtService,
      new EmailWhitelistService(configService),
      kanbanRepository as unknown as Repository<Kanban>,
    );

    Object.assign(authService["googleClient"], { verifyIdToken });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("authenticateWithGoogle", () => {
    it("signs in a whitelisted email that already has an account", async () => {
      mockGooglePayload(buildGooglePayload());
      userRepository.findByEmail.mockResolvedValue({
        id: "user-id",
        email: "owner@gmail.com",
      });

      const tokens = await authService.authenticateWithGoogle("google-token");

      expect(tokens).toEqual({
        accessToken: "signed-token",
        refreshToken: "signed-token",
      });
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it("creates the account on first login ignoring letter casing", async () => {
      mockGooglePayload(buildGooglePayload({ email: "AGENT@gmail.com" }));
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.save.mockImplementation((user: { email: string }) =>
        Promise.resolve({ ...user, id: "new-user-id" }),
      );
      kanbanRepository.save.mockResolvedValue([]);

      const tokens = await authService.authenticateWithGoogle("google-token");

      expect(tokens.accessToken).toBe("signed-token");
      expect(userRepository.save).toHaveBeenCalledTimes(1);
      expect(kanbanRepository.save).toHaveBeenCalledTimes(1);
    });

    it("answers 403 for an email outside the whitelist without touching the database", async () => {
      mockGooglePayload(buildGooglePayload({ email: "stranger@gmail.com" }));

      await expect(
        authService.authenticateWithGoogle("google-token"),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(userRepository.findByEmail).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
      expect(kanbanRepository.save).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it("rejects a whitelisted email that Google did not verify", async () => {
      mockGooglePayload(buildGooglePayload({ email_verified: false }));

      await expect(
        authService.authenticateWithGoogle("google-token"),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(userRepository.findByEmail).not.toHaveBeenCalled();
    });

    it("rejects a token without email claim", async () => {
      mockGooglePayload(buildGooglePayload({ email: undefined }));

      await expect(
        authService.authenticateWithGoogle("google-token"),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(userRepository.findByEmail).not.toHaveBeenCalled();
    });

    it("keeps answering 401 when the Google token is invalid", async () => {
      verifyIdToken.mockRejectedValue(new Error("Wrong recipient"));

      await expect(
        authService.authenticateWithGoogle("google-token"),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe("refreshAccessToken", () => {
    it("issues a new access token for a whitelisted user", async () => {
      jwtService.verify.mockReturnValue({
        id: "user-id",
        email: "owner@gmail.com",
      });
      userRepository.findOneBy.mockResolvedValue({
        id: "user-id",
        email: "owner@gmail.com",
      });

      await expect(
        authService.refreshAccessToken("refresh-token"),
      ).resolves.toEqual({ accessToken: "signed-token" });
    });

    it("refuses to refresh once the user email left the whitelist", async () => {
      jwtService.verify.mockReturnValue({
        id: "user-id",
        email: "removed@gmail.com",
      });
      userRepository.findOneBy.mockResolvedValue({
        id: "user-id",
        email: "removed@gmail.com",
      });

      await expect(
        authService.refreshAccessToken("refresh-token"),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });
});
