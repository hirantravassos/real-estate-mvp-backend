import { Repository } from "typeorm";
import { EvolutionMessage } from "../../../infrastructure/evolution/types/evolution.type";
import { RealtimeGateway } from "../../../infrastructure/realtime/realtime.gateway";
import { WhatsappConnection } from "../entities/whatsapp-connection.entity";
import { WhatsappHistorySyncService } from "./whatsapp-history-sync.service";

const connection = {
  id: "connection-1",
  userId: "user-1",
  status: "connected",
} as WhatsappConnection;

const messageFrom = (remoteJid: string) =>
  ({ key: { remoteJid, fromMe: false, id: remoteJid } }) as EvolutionMessage;

describe("WhatsappHistorySyncService", () => {
  let emitToUser: jest.Mock;
  let service: WhatsappHistorySyncService;

  beforeEach(() => {
    jest.useFakeTimers();
    emitToUser = jest.fn();
    service = new WhatsappHistorySyncService(
      {
        findOneBy: jest.fn().mockResolvedValue(connection),
      } as unknown as Repository<WhatsappConnection>,
      { emitToUser } as unknown as RealtimeGateway,
    );
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.useRealTimers();
  });

  it("starts syncing only when a fresh pairing opens", () => {
    service.handleOpened(connection.id);
    expect(service.snapshot(connection.id)).toBeNull();

    service.expectPairing(connection.id);
    service.handleOpened(connection.id);
    expect(service.snapshot(connection.id)).toMatchObject({
      status: "syncing",
      progress: 0,
    });
  });

  it("counts personal chats and messages and finishes at 100%", async () => {
    await service.handleChats(connection, [
      { remoteJid: "5511912345678@s.whatsapp.net" },
      { remoteJid: "120363000000000000@g.us" },
    ]);
    await service.handleMessages(
      connection,
      [
        messageFrom("5511912345678@s.whatsapp.net"),
        messageFrom("status@broadcast"),
      ],
      40,
    );
    expect(service.snapshot(connection.id)).toMatchObject({
      status: "syncing",
      progress: 40,
      chats: 1,
      messages: 1,
    });

    await service.handleMessages(connection, [], 100);
    expect(service.snapshot(connection.id)).toMatchObject({
      status: "done",
      progress: 100,
    });
    const [userId, event, payload] = emitToUser.mock.lastCall as [
      string,
      string,
      { historySync: { status: string } },
    ];
    expect([userId, event, payload.historySync.status]).toEqual([
      "user-1",
      "connection.updated",
      "done",
    ]);
  });

  it("finishes on its own when the phone stops sending", async () => {
    await service.handleMessages(connection, [], 20);
    jest.advanceTimersByTime(3 * 60 * 1000);
    expect(service.snapshot(connection.id)).toMatchObject({
      status: "done",
      progress: 100,
    });
  });

  it("forgets the sync on clear", async () => {
    await service.handleMessages(connection, [], 20);
    service.clear(connection.id);
    expect(service.snapshot(connection.id)).toBeNull();
  });
});
