import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { AuditLogOutcome } from "../../audit-logs/entities/audit-log.entity";
import { AuditLogService } from "../../audit-logs/services/audit-log.service";
import { User } from "../../users/entities/user.entity";
import { AdminSessionService } from "../services/admin-session.service";
import { AdminGuard } from "./admin.guard";

const adminUser = { id: "admin-id", email: "owner@example.com" } as User;

const contextOf = (user: User | undefined, sessionToken?: string) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        user,
        method: "GET",
        route: { path: "/admin/users" },
        headers: sessionToken ? { "x-admin-session": sessionToken } : {},
        ip: "203.0.113.7",
      }),
    }),
  }) as unknown as ExecutionContext;

const buildGuard = (allowed: boolean, sessionValid: boolean) => {
  const record = jest.fn().mockResolvedValue(undefined);
  const guard = new AdminGuard(
    {
      isAllowedEmail: () => allowed,
      verify: () => sessionValid,
    } as unknown as AdminSessionService,
    { record } as unknown as AuditLogService,
  );
  return { guard, record };
};

describe("AdminGuard", () => {
  it("lets an allowlisted account with a live session in", async () => {
    const { guard, record } = buildGuard(true, true);
    await expect(
      guard.canActivate(contextOf(adminUser, "session")),
    ).resolves.toBe(true);
    expect(record).not.toHaveBeenCalled();
  });

  it("refuses and audits an account outside the allowlist, session or not", async () => {
    const { guard, record } = buildGuard(false, true);
    await expect(
      guard.canActivate(contextOf(adminUser, "session")),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: AuditLogOutcome.DENIED,
        action: "GET /admin/users",
      }),
    );
  });

  it("refuses an allowlisted account without a live session", async () => {
    const { guard } = buildGuard(true, false);
    await expect(
      guard.canActivate(contextOf(adminUser)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("refuses a request without a signed in account", async () => {
    const { guard } = buildGuard(true, true);
    await expect(
      guard.canActivate(contextOf(undefined, "session")),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
