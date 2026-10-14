import { Repository } from "typeorm";
import { AccessLogService } from "../../access-logs/services/access-log.service";
import { AuditLogService } from "../../audit-logs/services/audit-log.service";
import { AccountDeletionReason } from "../../account-deletions/mails/account-deletion.mails";
import { AccountDeletionService } from "../../account-deletions/services/account-deletion.service";
import { BrokerMailService } from "../../notifications/services/broker-mail.service";
import { Subscription } from "../../subscriptions/entities/subscription.entity";
import { SubscriptionService } from "../../subscriptions/services/subscription.service";
import { User } from "../../users/entities/user.entity";
import { DataRetentionSchedulerService } from "./data-retention-scheduler.service";

const NOW = new Date("2026-10-13T12:00:00.000Z");
const day = (text: string) => new Date(`${text}T12:00:00.000Z`);

const subscriptionOf = (
  userId: string,
  trialEndsAt: Date,
  paidThrough: Date | null,
) =>
  ({
    id: `subscription-${userId}`,
    userId,
    trialEndsAt,
    paidThrough,
    canceledAt: null,
    providerPreapprovalId: null,
  }) as unknown as Subscription;

const buildService = (
  billingEnabled = true,
  subscriptions = [
    // Trial ended in May: past the 90 days.
    subscriptionOf("expired-broker", day("2026-05-01"), null),
    // Paid until September: still inside the 90 days.
    subscriptionOf("recent-broker", day("2026-01-01"), day("2026-09-20")),
  ],
  claimAffected = 1,
) => {
  const deleteAccount = jest.fn().mockResolvedValue(undefined);
  const deliver = jest.fn().mockResolvedValue(undefined);
  const update = jest.fn().mockResolvedValue({ affected: claimAffected });
  const service = new DataRetentionSchedulerService(
    { scheduleEnabled: true },
    {
      find: jest.fn().mockResolvedValue(subscriptions),
      update,
    } as unknown as Repository<Subscription>,
    {
      findOneBy: jest.fn(({ id }: { id: string }) =>
        Promise.resolve({ id, active: true } as User),
      ),
    } as unknown as Repository<User>,
    {
      purgeExpired: jest.fn().mockResolvedValue(0),
    } as unknown as AccessLogService,
    {
      purgeExpired: jest.fn().mockResolvedValue(0),
    } as unknown as AuditLogService,
    { deleteAccount } as unknown as AccountDeletionService,
    {
      billingEnabled,
      graceDays: 7,
      isCardActive: () => false,
      timelineOf: (subscription: Subscription) => ({
        trialEndsAt: subscription.trialEndsAt,
        paidThrough: subscription.paidThrough,
        canceledAt: subscription.canceledAt,
        firstCardChargeDueAt: null,
      }),
    } as unknown as SubscriptionService,
    { deliver } as unknown as BrokerMailService,
  );
  return { service, deleteAccount, deliver, update };
};

describe("DataRetentionSchedulerService.purgeExpiredAccounts", () => {
  it("erases only the account expired for more than 90 days", async () => {
    const { service, deleteAccount } = buildService();
    await expect(service.purgeExpiredAccounts(NOW)).resolves.toBe(1);
    expect(deleteAccount).toHaveBeenCalledTimes(1);
    expect(deleteAccount).toHaveBeenCalledWith(
      expect.objectContaining({ id: "expired-broker" }),
      "EXCLUIR",
      AccountDeletionReason.RETENTION,
    );
  });

  it("erases nothing while billing is off, nobody ever loses access", async () => {
    const { service, deleteAccount } = buildService(false);
    await expect(service.purgeExpiredAccounts(NOW)).resolves.toBe(0);
    expect(deleteAccount).not.toHaveBeenCalled();
  });
});

describe("DataRetentionSchedulerService.warnUpcomingErasures", () => {
  // Trial ended on July 18: erased on October 16, warned from October 9.
  const closeToErasure = () =>
    subscriptionOf("closing-broker", day("2026-07-18"), null);

  it("warns the broker a week before the erasure", async () => {
    const { service, deliver, update } = buildService(true, [
      closeToErasure(),
      subscriptionOf("recent-broker", day("2026-01-01"), day("2026-09-20")),
    ]);
    await expect(service.warnUpcomingErasures(NOW)).resolves.toBe(1);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "subscription-closing-broker" }),
      { erasureWarningSentFor: day("2026-07-18") },
    );
    expect(deliver).toHaveBeenCalledWith(
      "closing-broker",
      expect.any(Function),
    );
  });

  it("never warns twice for the same end of access", async () => {
    const warned = {
      ...closeToErasure(),
      erasureWarningSentFor: day("2026-07-18"),
    } as Subscription;
    const { service, deliver, update } = buildService(true, [warned]);
    await expect(service.warnUpcomingErasures(NOW)).resolves.toBe(0);
    expect(update).not.toHaveBeenCalled();
    expect(deliver).not.toHaveBeenCalled();
  });

  it("sends nothing when another server claimed the warning first", async () => {
    const { service, deliver } = buildService(true, [closeToErasure()], 0);
    await expect(service.warnUpcomingErasures(NOW)).resolves.toBe(0);
    expect(deliver).not.toHaveBeenCalled();
  });

  it("warns nobody while billing is off", async () => {
    const { service, deliver } = buildService(false, [closeToErasure()]);
    await expect(service.warnUpcomingErasures(NOW)).resolves.toBe(0);
    expect(deliver).not.toHaveBeenCalled();
  });
});
