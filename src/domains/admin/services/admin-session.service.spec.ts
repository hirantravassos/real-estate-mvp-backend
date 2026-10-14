import { ForbiddenException, HttpException, HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { TokenPayload } from "google-auth-library";
import { AuditLogOutcome } from "../../audit-logs/entities/audit-log.entity";
import { AuditLogService } from "../../audit-logs/services/audit-log.service";
import { AuthService } from "../../auth/services/auth.service";
import { User } from "../../users/entities/user.entity";
import { AdminSessionService } from "./admin-session.service";

const ACCESS_KEY = "a-very-long-backoffice-access-key-0123456789";
const JWT_SECRET = "jwt-secret-for-tests";
const EVIDENCE = { ip: "203.0.113.7", userAgent: "jest" };

const adminUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "Owner@Example.com",
  googleId: "google-owner",
  tokenVersion: 3,
} as User;

const otherUser = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "intruder@example.com",
  googleId: "google-intruder",
  tokenVersion: 0,
} as User;

const freshIdentity = (overrides: Partial<TokenPayload> = {}): TokenPayload =>
  ({
    sub: "google-owner",
    email: "owner@example.com",
    email_verified: true,
    iat: Math.floor(Date.now() / 1000) - 10,
    ...overrides,
  }) as TokenPayload;

const buildService = (
  options: {
    accessKey?: string;
    allowedEmails?: string[];
    identity?: TokenPayload | null;
    recentAttempts?: number;
  } = {},
) => {
  const record = jest.fn().mockResolvedValue(undefined);
  const countRecentAttempts = jest
    .fn()
    .mockResolvedValue(options.recentAttempts ?? 0);
  const readVerifiedGoogleIdentity = jest
    .fn()
    .mockResolvedValue(
      options.identity === undefined ? freshIdentity() : options.identity,
    );
  const service = new AdminSessionService(
    {
      allowedEmails: options.allowedEmails ?? ["owner@example.com"],
      accessKey: options.accessKey ?? ACCESS_KEY,
      sessionMinutes: 15,
    },
    { get: () => JWT_SECRET } as unknown as ConfigService,
    new JwtService({ secret: JWT_SECRET }),
    { readVerifiedGoogleIdentity } as unknown as AuthService,
    { record, countRecentAttempts } as unknown as AuditLogService,
  );
  return { service, record, readVerifiedGoogleIdentity };
};

const expectDenied = async (promise: Promise<unknown>) => {
  await expect(promise).rejects.toBeInstanceOf(ForbiddenException);
};

describe("AdminSessionService.open", () => {
  it("opens a session for the allowlisted, Google confirmed account with the right key", async () => {
    const { service, record } = buildService();
    const session = await service.open(
      adminUser,
      "id-token",
      ACCESS_KEY,
      EVIDENCE,
    );
    expect(session.email).toBe(adminUser.email);
    expect(service.verify(adminUser, session.sessionToken)).toBe(true);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: AuditLogOutcome.SUCCESS }),
    );
  });

  it("refuses an email outside the allowlist before even asking Google", async () => {
    const { service, readVerifiedGoogleIdentity, record } = buildService();
    await expectDenied(
      service.open(otherUser, "id-token", ACCESS_KEY, EVIDENCE),
    );
    expect(readVerifiedGoogleIdentity).not.toHaveBeenCalled();
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: AuditLogOutcome.DENIED }),
    );
  });

  it("refuses a wrong key", async () => {
    const { service, record } = buildService();
    await expectDenied(
      service.open(adminUser, "id-token", `${ACCESS_KEY}x`, EVIDENCE),
    );
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: AuditLogOutcome.FAILURE }),
    );
  });

  it("refuses when Google does not confirm a verified email", async () => {
    const { service } = buildService({ identity: null });
    await expectDenied(
      service.open(adminUser, "id-token", ACCESS_KEY, EVIDENCE),
    );
  });

  it("refuses a Google confirmation of another account", async () => {
    const { service } = buildService({
      identity: freshIdentity({ sub: "google-someone-else" }),
    });
    await expectDenied(
      service.open(adminUser, "id-token", ACCESS_KEY, EVIDENCE),
    );
  });

  it("refuses an old Google confirmation", async () => {
    const { service } = buildService({
      identity: freshIdentity({ iat: Math.floor(Date.now() / 1000) - 3600 }),
    });
    await expectDenied(
      service.open(adminUser, "id-token", ACCESS_KEY, EVIDENCE),
    );
  });

  it("locks the door after too many refused attempts, even with the right key", async () => {
    const { service, readVerifiedGoogleIdentity } = buildService({
      recentAttempts: 5,
    });
    const attempt = service.open(adminUser, "id-token", ACCESS_KEY, EVIDENCE);
    await expect(attempt).rejects.toBeInstanceOf(HttpException);
    await attempt.catch((error: HttpException) =>
      expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS),
    );
    expect(readVerifiedGoogleIdentity).not.toHaveBeenCalled();
  });

  it("stays closed with a short key", async () => {
    const { service } = buildService({ accessKey: "short" });
    expect(service.isEnabled).toBe(false);
    await expectDenied(service.open(adminUser, "id-token", "short", EVIDENCE));
  });

  it("stays closed without allowlisted emails", () => {
    const { service } = buildService({ allowedEmails: [] });
    expect(service.isEnabled).toBe(false);
    expect(service.isAllowedEmail(adminUser.email)).toBe(false);
  });
});

describe("AdminSessionService.verify", () => {
  const openSession = async () => {
    const { service } = buildService();
    const session = await service.open(
      adminUser,
      "id-token",
      ACCESS_KEY,
      EVIDENCE,
    );
    return { service, sessionToken: session.sessionToken };
  };

  it("never lets another account use the session", async () => {
    const { service, sessionToken } = await openSession();
    expect(service.verify(otherUser, sessionToken)).toBe(false);
  });

  it("dies with a logout, when the token version goes up", async () => {
    const { service, sessionToken } = await openSession();
    expect(
      service.verify({ ...adminUser, tokenVersion: 4 }, sessionToken),
    ).toBe(false);
  });

  it("never accepts a regular access token as an admin session", () => {
    const { service } = buildService();
    const accessToken = new JwtService({ secret: JWT_SECRET }).sign({
      id: adminUser.id,
      ver: adminUser.tokenVersion,
      typ: "admin_session",
    });
    expect(service.verify(adminUser, accessToken)).toBe(false);
  });

  it("dies when the access key changes", async () => {
    const { sessionToken } = await openSession();
    const { service: rotated } = buildService({
      accessKey: `${ACCESS_KEY}-rotated`,
    });
    expect(rotated.verify(adminUser, sessionToken)).toBe(false);
  });
});
