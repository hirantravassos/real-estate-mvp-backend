import { Repository } from "typeorm";
import { AccessLogService } from "../../access-logs/services/access-log.service";
import { AccountDeletionService } from "../../account-deletions/services/account-deletion.service";
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

const buildService = (billingEnabled = true) => {
  const subscriptions = [
    // Trial ended in May: past the 90 days.
    subscriptionOf("expired-broker", day("2026-05-01"), null),
    // Paid until September: still inside the 90 days.
    subscriptionOf("recent-broker", day("2026-01-01"), day("2026-09-20")),
  ];
  const deleteAccount = jest.fn().mockResolvedValue(undefined);
  const service = new DataRetentionSchedulerService(
    { scheduleEnabled: true },
    {
      find: jest.fn().mockResolvedValue(subscriptions),
    } as unknown as Repository<Subscription>,
    {
      findOneBy: jest.fn(({ id }: { id: string }) =>
        Promise.resolve({ id, active: true } as User),
      ),
    } as unknown as Repository<User>,
    {
      purgeExpired: jest.fn().mockResolvedValue(0),
    } as unknown as AccessLogService,
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
  );
  return { service, deleteAccount };
};

describe("DataRetentionSchedulerService.purgeExpiredAccounts", () => {
  it("erases only the account expired for more than 90 days", async () => {
    const { service, deleteAccount } = buildService();
    await expect(service.purgeExpiredAccounts(NOW)).resolves.toBe(1);
    expect(deleteAccount).toHaveBeenCalledTimes(1);
    expect(deleteAccount).toHaveBeenCalledWith(
      expect.objectContaining({ id: "expired-broker" }),
      "EXCLUIR",
    );
  });

  it("erases nothing while billing is off, nobody ever loses access", async () => {
    const { service, deleteAccount } = buildService(false);
    await expect(service.purgeExpiredAccounts(NOW)).resolves.toBe(0);
    expect(deleteAccount).not.toHaveBeenCalled();
  });
});
