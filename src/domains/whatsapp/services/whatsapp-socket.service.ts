import { Injectable, OnModuleInit } from "@nestjs/common";
import makeWASocket, {
  Browsers,
  ConnectionState,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import * as qrcode from "qrcode-terminal";
import { join } from "path";
import { existsSync, mkdirSync, promises as fs } from "node:fs";
import { WhatsappSessionRepository } from "../repositories/whatsapp-session.repository";
import { WhatsappContactRepository } from "../repositories/whatsapp-contact.repository";
import { WhatsappChatRepository } from "../repositories/whatsapp-chat.repository";
import { WhatsappMessageRepository } from "../repositories/whatsapp-message.repository";
import {
  WhatsappBaileyMessageHistorySetDto,
  WhatsappBaileyMessageUpsert,
} from "../dtos/whatsapp-bailey.dto";

@Injectable()
export class WhatsappSocketService implements OnModuleInit {
  private readonly sockets = new Map<string, WASocket>();
  private readonly sessionsDir = join(process.cwd(), "sessions");

  constructor(
    private readonly sessionRepository: WhatsappSessionRepository,
    private readonly contactRepository: WhatsappContactRepository,
    private readonly chatRepository: WhatsappChatRepository,
    private readonly messageRepository: WhatsappMessageRepository,
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
      void this.messageHistorySet(sessionId, data);
    });

    socket.ev.on("messages.upsert", (m) => {
      void this.messageUpset(sessionId, m);
    });

    socket.ev.on("connection.update", (update) => {
      void this.connectionUpdate(sessionId, update);
    });
  }

  public getSocket(sessionId: string): WASocket | undefined {
    return this.sockets.get(sessionId);
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

      console.log("Connection closed, but not terminal. Restarting socket...");
      this.start(sessionId).catch(console.error);
    }
  }

  private async messageHistorySet(
    sessionId: string,
    data: WhatsappBaileyMessageHistorySetDto,
  ) {
    const { chats, contacts, messages } = data;

    console.log("Initial Sync Received:");
    console.log(chats.length + " conversations found.");
    console.log(contacts.length + " contacts found.");
    console.log(messages.length + " messages found.");

    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ["user"],
    });

    if (!session || !session.user) {
      console.error(
        "Session or user not found to sync history for " + sessionId,
      );
      return;
    }

    const user = session.user;

    // 1. Upsert Contacts
    if (contacts && contacts.length > 0) {
      const mappedContacts = contacts
        .filter((c) => c.id)
        .map((c) => ({
          user,
          jid: c.id,
          name: c.name || null,
          pushName: c.notify || null,
        }));

      const chunkSize = 200;
      for (let i = 0; i < mappedContacts.length; i += chunkSize) {
        const chunk = mappedContacts.slice(i, i + chunkSize);
        await this.contactRepository
          .upsert(chunk, {
            conflictPaths: ["user", "jid"],
            skipUpdateIfNoValuesChanged: true,
          })
          .catch((e) => console.error("Error upserting contacts", e));
      }
      console.log("Contacts sync complete.");
    }

    // 2. Upsert Chats
    if (chats && chats.length > 0) {
      const mappedChats = chats
        .filter((c) => c.id)
        .map((c) => ({
          user,
          jid: c.id!,
          unreadCount: c.unreadCount || 0,
          lastMessageTimestamp: c.conversationTimestamp
            ? new Date(Number(c.conversationTimestamp) * 1000)
            : null,
        }));

      const chunkSize = 200;
      for (let i = 0; i < mappedChats.length; i += chunkSize) {
        const chunk = mappedChats.slice(i, i + chunkSize);
        await this.chatRepository
          .upsert(chunk, {
            conflictPaths: ["user", "jid"],
            skipUpdateIfNoValuesChanged: true,
          })
          .catch((e) => console.error("Error upserting chats", e));
      }
      console.log("Chats sync complete.");
    }

    // 3. Upsert Messages
    if (messages && messages.length > 0) {
      const mappedMessages = messages
        .map((m) => ({
          user,
          remoteJid: m.key.remoteJid || "",
          messageId: m.key.id || "",
          fromMe: m.key.fromMe || false,
          type: Object.keys(m.message || {})[0] || "unknown",
          content:
            m.message?.conversation ||
            m.message?.extendedTextMessage?.text ||
            JSON.stringify(m.message || {}),
          timestamp: m.messageTimestamp
            ? new Date(Number(m.messageTimestamp) * 1000)
            : new Date(),
        }))
        .filter((m) => m.remoteJid && m.messageId); // Must have ID and JID

      const chunkSize = 200;
      for (let i = 0; i < mappedMessages.length; i += chunkSize) {
        const chunk = mappedMessages.slice(i, i + chunkSize);
        await this.messageRepository
          .upsert(chunk, {
            conflictPaths: ["user", "remoteJid", "messageId"],
            skipUpdateIfNoValuesChanged: true,
          })
          .catch((e) =>
            console.error("Error upserting historical messages", e),
          );
      }
      console.log("History messages sync complete.");
    }
  }

  private async messageUpset(
    sessionId: string,
    data: WhatsappBaileyMessageUpsert,
  ) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ["user"],
    });

    if (!session || !session.user) return;

    const newMessages = data.messages
      .map((msg) => ({
        user: session.user,
        remoteJid: msg.key.remoteJid || "",
        messageId: msg.key.id || "",
        fromMe: msg.key.fromMe || false,
        type: Object.keys(msg.message || {})[0] || "unknown",
        content:
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          JSON.stringify(msg.message || {}),
        timestamp: msg.messageTimestamp
          ? new Date(Number(msg.messageTimestamp) * 1000)
          : new Date(),
      }))
      .filter((msg) => msg.remoteJid && msg.messageId);

    if (newMessages.length > 0) {
      await this.messageRepository
        .upsert(newMessages, {
          conflictPaths: ["user", "remoteJid", "messageId"],
          skipUpdateIfNoValuesChanged: true,
        })
        .catch((e) => console.error("Error upserting new literal messages", e));
    }
  }

  private async destroySession(
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
}
