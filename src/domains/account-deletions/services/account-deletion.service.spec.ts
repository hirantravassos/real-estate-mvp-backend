import { BadGatewayException, BadRequestException } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { StorageService } from "../../../infrastructure/storage/services/storage.service";
import { MercadoPagoService } from "../../../infrastructure/payments/services/mercado-pago.service";
import { WhatsappConnectionService } from "../../inbox/services/whatsapp-connection.service";
import { BrokerMailService } from "../../notifications/services/broker-mail.service";
import { Subscription } from "../../subscriptions/entities/subscription.entity";
import { SubscriptionService } from "../../subscriptions/services/subscription.service";
import { User } from "../../users/entities/user.entity";
import {
  ANONYMOUS_NAME,
  deletedGoogleIdOf,
} from "../helpers/deleted-account.helper";
import { AccountDeletionService } from "./account-deletion.service";

const OWNER_ID = "11111111-1111-1111-1111-111111111111";

const owner = {
  id: OWNER_ID,
  email: "maria@example.com",
  name: "Maria Souza",
  googleId: "108234567890123456789",
} as User;

const buildService = (
  options: { cardActive?: boolean; cardFails?: boolean } = {},
) => {
  const deleteCalls: { entity: unknown; criteria: unknown }[] = [];
  const updateCalls: { entity: unknown; criteria: unknown; values: unknown }[] =
    [];
  const manager = {
    delete: jest.fn((entity: unknown, criteria: unknown) => {
      deleteCalls.push({ entity, criteria });
      return Promise.resolve({ affected: 1 });
    }),
    update: jest.fn((entity: unknown, criteria: unknown, values: unknown) => {
      updateCalls.push({ entity, criteria, values });
      return Promise.resolve({ affected: 1 });
    }),
  } as unknown as EntityManager;

  const subscriptionRepository = {
    findOneBy: jest.fn().mockResolvedValue(
      options.cardActive
        ? {
            id: "subscription-1",
            userId: OWNER_ID,
            providerPreapprovalId: "preapproval-1",
          }
        : null,
    ),
    update: jest.fn().mockResolvedValue(undefined),
  };
  const transaction = jest.fn(
    (work: (manager: EntityManager) => Promise<void>) => work(manager),
  );
  const dataSource = {
    getRepository: jest.fn(() => subscriptionRepository),
    transaction,
  } as unknown as DataSource;

  const deletePrefix = jest.fn().mockResolvedValue(0);
  const storageService = {
    userS3KeyPrefixes: jest.fn((userId: string) => [
      `documents/${userId}/`,
      `inbox/${userId}/`,
    ]),
    deletePrefix,
  } as unknown as StorageService;
  const cancelCardSubscription = options.cardFails
    ? jest.fn().mockRejectedValue(new Error("timeout"))
    : jest.fn().mockResolvedValue({});
  const mercadoPagoService = {
    cancelCardSubscription,
  } as unknown as MercadoPagoService;
  const subscriptionService = {
    isCardActive: jest.fn(() => Boolean(options.cardActive)),
    invalidate: jest.fn(),
  } as unknown as SubscriptionService;
  const whatsappConnectionService = {
    disconnect: jest.fn().mockResolvedValue(undefined),
  } as unknown as WhatsappConnectionService;

  const notify = jest.fn();
  const brokerMailService = { notify } as unknown as BrokerMailService;

  const service = new AccountDeletionService(
    dataSource,
    storageService,
    mercadoPagoService,
    subscriptionService,
    whatsappConnectionService,
    brokerMailService,
  );
  return {
    service,
    deleteCalls,
    updateCalls,
    transaction,
    deletePrefix,
    cancelCardSubscription,
    subscriptionRepository,
    notify,
  };
};

describe("AccountDeletionService", () => {
  it("refuses without the typed confirmation", async () => {
    const { service, transaction } = buildService();
    await expect(
      service.deleteAccount(owner, "excluir"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("only touches rows of the account being deleted, never another tenant", async () => {
    const { service, deleteCalls, updateCalls } = buildService();
    await service.deleteAccount(owner, "EXCLUIR");

    expect(deleteCalls.length).toBeGreaterThan(15);
    for (const call of [...deleteCalls, ...updateCalls]) {
      const criteria = call.criteria as Record<string, unknown> | string;
      if (typeof criteria === "string") {
        expect(criteria).toBe(OWNER_ID);
      } else {
        expect(criteria.userId).toBe(OWNER_ID);
      }
    }
  });

  it("anonymizes the broker so nobody can be identified", async () => {
    const { service, updateCalls } = buildService();
    await service.deleteAccount(owner, "EXCLUIR");

    const userUpdate = updateCalls.find((call) => call.entity === User);
    const values = userUpdate?.values as Partial<User>;
    expect(values.active).toBe(false);
    expect(values.name).toBe(ANONYMOUS_NAME);
    expect(values.email).not.toContain("maria");
    expect(values.email).toMatch(/@removido\.invalid$/);
    expect(values.googleId).toBe(deletedGoogleIdOf(owner.googleId));
    expect(values.googleId).not.toContain(owner.googleId);
    expect(values.phone).toBeNull();
    expect(values.aiMemory).toBeNull();
    expect(values.termsAcceptedIp).toBeNull();
  });

  it("deletes the files only under the broker's own folders", async () => {
    const { service, deletePrefix } = buildService();
    await service.deleteAccount(owner, "EXCLUIR");
    const prefixes = (deletePrefix.mock.calls as [string][]).map(
      ([prefix]) => prefix,
    );
    expect(prefixes.length).toBeGreaterThan(0);
    for (const prefix of prefixes) expect(prefix).toContain(`/${OWNER_ID}/`);
  });

  it("stops the card before erasing anything", async () => {
    const { service, cancelCardSubscription, subscriptionRepository } =
      buildService({
        cardActive: true,
      });
    await service.deleteAccount(owner, "EXCLUIR");
    expect(cancelCardSubscription).toHaveBeenCalledWith("preapproval-1");
    expect(subscriptionRepository.update).toHaveBeenCalledWith(
      "subscription-1",
      expect.objectContaining({ providerPreapprovalStatus: "cancelled" }),
    );
  });

  it("keeps everything when the card cannot be cancelled", async () => {
    const { service, transaction } = buildService({
      cardActive: true,
      cardFails: true,
    });
    await expect(
      service.deleteAccount(owner, "EXCLUIR"),
    ).rejects.toBeInstanceOf(BadGatewayException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("confirms the deletion to the address the account had before", async () => {
    const { service, notify } = buildService();
    await service.deleteAccount(owner, "EXCLUIR");
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(
      { id: OWNER_ID, email: "maria@example.com", name: "Maria Souza" },
      expect.any(Function),
    );
  });

  it("mails nothing when the deletion is refused", async () => {
    const { service, notify } = buildService({
      cardActive: true,
      cardFails: true,
    });
    await expect(service.deleteAccount(owner, "EXCLUIR")).rejects.toThrow();
    expect(notify).not.toHaveBeenCalled();
  });

  it("keeps the subscription and payment rows, only scrubbed", async () => {
    const { service, deleteCalls } = buildService();
    await service.deleteAccount(owner, "EXCLUIR");
    expect(deleteCalls.map((call) => call.entity)).not.toContain(Subscription);
  });
});
