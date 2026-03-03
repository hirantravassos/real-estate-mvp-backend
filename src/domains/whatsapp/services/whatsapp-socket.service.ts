import { Injectable, OnModuleInit } from "@nestjs/common";
import makeWASocket, {
  Browsers,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import * as qrcode from "qrcode-terminal";
import { join } from "path";
import { existsSync, mkdirSync, promises as fs } from "node:fs";
import { WhatsappSessionRepository } from "../repositories/whatsapp-session.repository";

@Injectable()
export class WhatsappSocketService implements OnModuleInit {
  private readonly sockets = new Map<string, WASocket>();
  private readonly sessionsDir = join(process.cwd(), "sessions");

  constructor(private readonly sessionRepository: WhatsappSessionRepository) {
    if (!existsSync(this.sessionsDir)) {
      mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  async onModuleInit(): Promise<void> {
    const activeSessions = await this.sessionRepository.find({
      where: { active: true },
    });

    for (const session of activeSessions) {
      await this.initializeSession(session.id).catch((error) => {
        console.error("Initial boot failed for " + session.id, error);
      });
    }
  }

  public async initializeSession(sessionId: string): Promise<void> {
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

    this.sockets.set(sessionId, socket);

    socket.ev.on("messaging-history.set", (data) => {
      const { chats, contacts, messages } = data;

      console.log("Initial Sync Received:");
      console.log(chats.length + " conversations found.", chats);
      console.log(contacts.length + " contacts found.", contacts);
      console.log(messages.length + " contacts found.", messages);

      chats.forEach((chat) => {
        console.log("Chat JID: " + chat.id + " | Unread: " + chat.unreadCount);
      });
    });

    socket.ev.on("creds.update", () => {
      saveCreds().catch((err) =>
        console.error("Save creds failed for " + sessionId, err),
      );
    });

    socket.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrcode.generate(qr, { small: true });
      }

      if (connection === "open") {
        console.log("Session " + sessionId + " is now active.");
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;

        const isTerminal =
          statusCode === 401 || statusCode === 405 || statusCode === 411;

        if (isTerminal) {
          console.error("Terminal failure for " + sessionId + ". Wiping data.");
          this.destroySession(sessionId, statusCode).catch(console.error);
          return;
        }

        console.log(
          "Connection closed, but not terminal. Restarting socket...",
        );
        this.initializeSession(sessionId).catch(console.error);
      }
    });
  }

  async destroySession(sessionId: string, statusCode?: number): Promise<void> {
    const socket = this.sockets.get(sessionId);

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

  public getSocket(sessionId: string): WASocket | undefined {
    return this.sockets.get(sessionId);
  }
}
