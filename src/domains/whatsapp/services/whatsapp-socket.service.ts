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
import { User } from "../../users/entities/user.entity";

@Injectable()
export class WhatsappSocketService implements OnModuleInit {
  private socket: WASocket;
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
    const sessions = await this.sessionRepository.find({
      where: { active: true },
    });

    for (const session of sessions) {
      const user = await this.getUsers(session.id);
      await this.start(session.id, user).catch((error) => {
        console.error("Initial boot failed for " + session.id, error);
      });
    }
  }

  public async start(sessionId: string, user: User): Promise<void> {
    const socket = await this.createSocket(sessionId);
    this.socket = socket;

    socket.ev.on("messaging-history.set", (data) => {
      void this.handleMessagingHistorySet(user, data);
    });

    socket.ev.on("messages.upsert", (data) => {
      void this.handleMessageUpsert(user, data);
    });

    socket.ev.on("messages.update", (data) => {
      void this.handleMessageUpdate(user, data);
    });

    socket.ev.on("chats.upsert", (data) => {
      void this.handleChat(user, data);
    });

    socket.ev.on("chats.update", (data) => {
      void this.handleChat(user, data);
    });

    socket.ev.on("contacts.upsert", (data) => {
      void this.handleContactUpsert(user, data);
    });

    socket.ev.on("contacts.update", (data) => {
      void this.handleContactUpdate(user, data);
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
    await this.sessionRepository.update(
      {
        id: sessionId,
      },
      {
        status: WhatsappConnectionStatusEnum.CLOSED,
      },
    );

    console.warn(
      "Session " +
        sessionId +
        " OBLITERATED (Code: " +
        statusCode +
        "). DB record and files removed.",
    );
  }

  private handleMessagingHistorySet(
    user: User,
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
    if (!user) return;

    for (const chat of data.chats) {
      void this.chatService.saveChat(user, chat);

      for (const syncMessage of chat?.messages ?? []) {
        void this.messageService.saveHistorySyncMessage(user, syncMessage);
        void this.contactService.updateContactFromSyncMessage(
          user,
          this.socket,
          syncMessage,
        );
      }
    }

    for (const WAMessage of data.messages) {
      void this.messageService.saveWAMessage(user, WAMessage);
    }
  }

  private handleMessageUpsert(
    user: User,
    data: {
      messages: WAMessage[];
      type: MessageUpsertType;
      requestId?: string;
    },
  ) {
    for (const WAMessage of data.messages) {
      void this.messageService.saveWAMessage(user, WAMessage);
      void this.contactService.updateContactFromWAMessage(
        user,
        this.socket,
        WAMessage,
      );
    }
  }

  private handleMessageUpdate(user: User, data: WAMessageUpdate[]) {
    for (const WAMessage of data) {
      void this.messageService.saveWAMessage(user, WAMessage);
      void this.contactService.updateContactFromWAMessage(
        user,
        this.socket,
        WAMessage,
      );
    }
  }

  private handleChat(user: User, data: Chat[]) {
    for (const chat of data) {
      void this.chatService.saveChat(user, chat);

      for (const message of chat?.messages ?? []) {
        void this.messageService.saveHistorySyncMessage(user, message);
        void this.contactService.updateContactFromSyncMessage(
          user,
          this.socket,
          message,
        );
      }
    }
  }

  private handleContactUpsert(user: User, data: Contact[]) {
    for (const contact of data) {
      void this.contactService.saveFromContact(user, contact);
    }
  }

  private handleContactUpdate(user: User, data: Partial<Contact>[]) {
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

  private async connectionUpdate(
    sessionId: string,
    update: Partial<ConnectionState>,
  ) {
    const { connection, lastDisconnect, qr } = update;
    const socket = this.getSocket(sessionId);

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
        {
          status: WhatsappConnectionStatusEnum.OPEN,
          name: socket?.authState?.creds?.me?.name,
        },
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

      const user = await this.getUsers(sessionId);
      this.start(sessionId, user).catch(console.error);
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
