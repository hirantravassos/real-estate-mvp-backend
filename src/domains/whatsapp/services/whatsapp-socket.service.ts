import {
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from "@nestjs/common";
import makeWASocket, {
  Browsers,
  Chat,
  ConnectionState,
  Contact,
  fetchLatestBaileysVersion,
  MessageUpsertType,
  proto,
  useMultiFileAuthState,
  WAMessage,
  WAMessageUpdate,
  WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import * as qrcode from "qrcode-terminal";
import { join } from "path";
import { existsSync, mkdirSync, promises as fs } from "node:fs";
import { WhatsappSessionRepository } from "../repositories/whatsapp-session.repository";
import { WhatsappConnectionStatusEnum } from "../enums/whatsapp-connection-status.enum";
import { WhatsappMessageService } from "./whatsapp-message.service";
import { WhatsappChatService } from "./whatsapp-chat.service";
import { WhatsappContactService } from "./whatsapp-contact.service";

@Injectable()
export class WhatsappSocketService implements OnModuleInit {
  private readonly sockets = new Map<string, WASocket>();
  private readonly sessionsDir = join(process.cwd(), "sessions");

  constructor(
    private readonly sessionRepository: WhatsappSessionRepository,
    private readonly messageService: WhatsappMessageService,
    private readonly chatService: WhatsappChatService,
    private readonly contactService: WhatsappContactService,
  ) {
    if (!existsSync(this.sessionsDir)) {
      mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  async onModuleInit(): Promise<void> {
    const activeSessions = await this.sessionRepository.find({
      where: { active: true },
    });

    for (const session of activeSessions) {
      await this.start(session.id).catch((error) => {
        console.error("Initial boot failed for " + session.id, error);
      });
    }
  }

  public async start(sessionId: string): Promise<void> {
    const socket = await this.createSocket(sessionId);

    socket.ev.on("messaging-history.set", (data) => {
      void this.handleMessagingHistorySet(sessionId, data);
    });

    socket.ev.on("messages.upsert", (data) => {
      void this.handleMessageUpsert(sessionId, data);
    });

    socket.ev.on("messages.update", (data) => {
      void this.handleMessageUpdate(sessionId, data);
    });

    socket.ev.on("chats.upsert", (data) => {
      void this.handleChatUpsert(sessionId, data);
    });

    socket.ev.on("chats.update", (data) => {
      void this.handleChatUpdate(sessionId, data);
    });

    socket.ev.on("contacts.upsert", (data) => {
      void this.handleContactUpsert(sessionId, data);
    });

    socket.ev.on("contacts.update", (data) => {
      void this.handleContactUpdate(sessionId, data);
    });

    socket.ev.on("connection.update", (data) => {
      void this.connectionUpdate(sessionId, data);
    });
  }

  public getSocket(sessionId: string): WASocket | undefined {
    return this.sockets.get(sessionId);
  }

  public async destroySession(
    sessionId: string,
    statusCode?: number,
  ): Promise<void> {
    const socket = this.getSocket(sessionId);

    if (socket) {
      socket.ev.removeAllListeners("connection.update");
      socket.ev.removeAllListeners("creds.update");
      socket.end(undefined);
      this.sockets.delete(sessionId);
    }

    const sessionPath = join(this.sessionsDir, sessionId);

    await fs.rm(sessionPath, { recursive: true, force: true });
    await this.sessionRepository.delete({ id: sessionId });

    console.warn(
      "Session " +
        sessionId +
        " OBLITERATED (Code: " +
        statusCode +
        "). DB record and files removed.",
    );
  }

  private async handleMessagingHistorySet(
    sessionId: string,
    data: {
      chats: Chat[];
      contacts: Contact[];
      messages: WAMessage[];
      isLatest?: boolean;
      progress?: number | null;
      syncType?: proto.HistorySync.HistorySyncType | null;
      peerDataRequestSessionId?: string | null;
    },
  ) {
    const user = await this.getUsers(sessionId);

    if (!user) return;

    for (const chat of data.chats) {
      void this.chatService.saveChat(user, chat);

      for (const syncMessage of chat?.messages ?? []) {
        void this.messageService.saveHistorySyncMessage(user, syncMessage);
        void this.contactService.updateContactFromSyncMessage(
          user,
          syncMessage,
        );
      }
    }

    for (const WAMessage of data.messages) {
      void this.messageService.saveWAMessage(user, WAMessage);
    }
  }

  private async handleMessageUpsert(
    sessionId: string,
    data: {
      messages: WAMessage[];
      type: MessageUpsertType;
      requestId?: string;
    },
  ) {
    const user = await this.getUsers(sessionId);
    for (const WAMessage of data.messages) {
      void this.messageService.saveWAMessage(user, WAMessage);
      void this.contactService.updateContactFromWAMessage(user, WAMessage);
    }
  }

  private async handleMessageUpdate(
    sessionId: string,
    data: WAMessageUpdate[],
  ) {
    const user = await this.getUsers(sessionId);
    for (const WAMessage of data) {
      void this.messageService.saveWAMessage(user, WAMessage);
      void this.contactService.updateContactFromWAMessage(user, WAMessage);
    }
  }

  private async handleChatUpsert(sessionId: string, data: Chat[]) {
    const user = await this.getUsers(sessionId);

    for (const chat of data) {
      void this.chatService.saveChat(user, chat);

      for (const message of chat?.messages ?? []) {
        void this.messageService.saveHistorySyncMessage(user, message);
        void this.contactService.updateContactFromSyncMessage(user, message);
      }
    }
  }

  private async handleChatUpdate(sessionId: string, data: Chat[]) {
    const user = await this.getUsers(sessionId);

    for (const chat of data) {
      void this.chatService.saveChat(user, chat);

      for (const message of chat?.messages ?? []) {
        await this.messageService.saveHistorySyncMessage(user, message);
      }
    }
  }

  private async handleContactUpsert(sessionId: string, data: Contact[]) {
    const user = await this.getUsers(sessionId);
    for (const contact of data) {
      void this.contactService.saveFromContact(user, contact);
    }
  }

  private async handleContactUpdate(
    sessionId: string,
    data: Partial<Contact>[],
  ) {
    const user = await this.getUsers(sessionId);
    for (const contact of data) {
      void this.contactService.saveFromContact(user, contact);
    }
  }

  private async createSocket(
    sessionId: string,
  ): Promise<ReturnType<typeof makeWASocket>> {
    const sessionPath = join(this.sessionsDir, sessionId);

    if (!existsSync(sessionPath)) {
      mkdirSync(sessionPath, { recursive: true });
    }

    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const socket = makeWASocket({
      version,
      auth: state,
      browser: Browsers.macOS("Desktop"),
      syncFullHistory: true,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
    });

    socket.ev.on("creds.update", () => {
      saveCreds().catch((err) =>
        console.error("Save creds failed for " + sessionId, err),
      );
    });

    this.sockets.set(sessionId, socket);

    return socket;
  }

  private connectionUpdate(
    sessionId: string,
    update: Partial<ConnectionState>,
  ) {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrcode.generate(qr, { small: true });
      void this.sessionRepository.update(
        { id: sessionId },
        { qr, status: WhatsappConnectionStatusEnum.QR },
      );
    }

    if (connection === "open") {
      void this.sessionRepository.update(
        { id: sessionId },
        { status: WhatsappConnectionStatusEnum.OPEN },
      );
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;

      const isTerminal =
        statusCode === 401 || statusCode === 405 || statusCode === 411;

      if (isTerminal) {
        this.destroySession(sessionId, statusCode).catch(console.error);
        return;
      }

      this.start(sessionId).catch(console.error);
    }
  }

  private async getUsers(sessionId: string) {
    const { user } = await this.sessionRepository
      .findOneOrFail({
        where: { id: sessionId },
        relations: { user: true },
      })
      .catch(() => {
        throw new InternalServerErrorException("getUsers: Session not found");
      });
    return user;
  }
}
