import { Repository } from "typeorm";
import { BrokerMailService } from "../../notifications/services/broker-mail.service";
import { Subscription } from "../entities/subscription.entity";
import { SubscriptionReminderSchedulerService } from "./subscription-reminder-scheduler.service";
import { SubscriptionService } from "./subscription.service";

const NOW = new Date("2026-10-13T12:00:00.000Z");

const subscriptionOf = (overrides: Partial<Subscription>) =>
  ({
    id: "subscription-1",
    userId: "broker-1",
    trialEndsAt: new Date("2026-10-14T12:00:00.000Z"),
    paidThrough: null,
    canceledAt: null,
    providerPreapprovalId: null,
    providerPreapprovalStatus: null,
    trialReminderSentAt: null,
    renewalReminderSentFor: null,
    ...overrides,
  }) as Subscription;

const buildService = (
  subscriptions: Subscription[],
  options: {
    billingEnabled?: boolean;
    cardActive?: boolean;
    claimed?: number;
  } = {},
) => {
  const update = jest
    .fn()
    .mockResolvedValue({ affected: options.claimed ?? 1 });
  const deliver = jest.fn().mockResolvedValue(undefined);
  const service = new SubscriptionReminderSchedulerService(
    {
      host: "smtp.example.com",
      port: 587,
      user: "",
      password: "",
      from: "noreply@example.com",
      remindersEnabled: true,
    },
    {
      find: jest.fn().mockResolvedValue(subscriptions),
      update,
    } as unknown as Repository<Subscription>,
    {
      billingEnabled: options.billingEnabled ?? true,
      renewalWindowDays: 10,
      isCardActive: () => Boolean(options.cardActive),
      effectivePlan: jest.fn().mockResolvedValue({ name: "Profissional" }),
    } as unknown as SubscriptionService,
    { deliver } as unknown as BrokerMailService,
  );
  return { service, update, deliver };
};

describe("SubscriptionReminderSchedulerService", () => {
  it("reminds a trial about to end, once", async () => {
    const { service, update, deliver } = buildService([subscriptionOf({})]);
    await expect(service.remindTrialsEnding(NOW)).resolves.toBe(1);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "subscription-1" }),
      { trialReminderSentAt: NOW },
    );
    expect(deliver).toHaveBeenCalledWith("broker-1", expect.any(Function));
  });

  it("does not remind a trial whose card already charges at its end", async () => {
    const { service, deliver } = buildService([subscriptionOf({})], {
      cardActive: true,
    });
    await expect(service.remindTrialsEnding(NOW)).resolves.toBe(0);
    expect(deliver).not.toHaveBeenCalled();
  });

  it("sends nothing when another server claimed the reminder", async () => {
    const { service, deliver } = buildService([subscriptionOf({})], {
      claimed: 0,
    });
    await expect(service.remindTrialsEnding(NOW)).resolves.toBe(0);
    expect(deliver).not.toHaveBeenCalled();
  });

  it("reminds the Pix renewal of each paid month once", async () => {
    const paidThrough = new Date("2026-10-15T12:00:00.000Z");
    const { service, update, deliver } = buildService([
      subscriptionOf({ paidThrough }),
      subscriptionOf({
        id: "subscription-2",
        userId: "broker-2",
        paidThrough,
        renewalReminderSentFor: paidThrough,
      }),
    ]);
    await expect(service.remindPixRenewals(NOW)).resolves.toBe(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "subscription-1" }),
      { renewalReminderSentFor: paidThrough },
    );
    expect(deliver).toHaveBeenCalledWith("broker-1", expect.any(Function));
  });

  it("reminds nobody while billing is off", async () => {
    const { service, deliver } = buildService([subscriptionOf({})], {
      billingEnabled: false,
    });
    await expect(service.remindTrialsEnding(NOW)).resolves.toBe(0);
    await expect(service.remindPixRenewals(NOW)).resolves.toBe(0);
    expect(deliver).not.toHaveBeenCalled();
  });
});
