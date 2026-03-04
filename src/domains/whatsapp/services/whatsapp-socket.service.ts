import { Injectable, InternalServerErrorException, OnModuleInit, } from "@nestjs/common";
import makeWASocket, {
  Browsers,
  Chat,
  ConnectionState,
  Contact,
  fetchLatestBaileysVersion,
  proto,
  useMultiFileAuthState,
  WAMessage,
  WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import * as qrcode from "qrcode-terminal";
import { join } from "path";
import { existsSync, mkdirSync, promises as fs } from "node:fs";
import { WhatsappSessionRepository } from "../repositories/whatsapp-session.repository";
import { WhatsappConnectionStatusEnum } from "../enums/whatsapp-connection-status.enum";
import { WhatsappChatRepository } from "../repositories/whatsapp-chat.repository";
import dayjs from "dayjs";
import { WhatsappMessageRepository } from "../repositories/whatsapp-message.repository";
import { WhatsappChat } from "../entities/whatsapp-chat.entity";
import IMessage = proto.IMessage;

@Injectable()
export class WhatsappSocketService implements OnModuleInit {
  private readonly sockets = new Map<string, WASocket>();
  private readonly sessionsDir = join(process.cwd(), "sessions");

  constructor(
    private readonly sessionRepository: WhatsappSessionRepository,
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
      void this.handleHistoryLoad(sessionId, data);
    });

    socket.ev.on("messages.upsert", (data) => {
      // console.log("messages.upsert", { data });
    });

    socket.ev.on("messages.update", (data) => {
      // console.log("messages.update", { data });
    });

    socket.ev.on("chats.upsert", (data) => {
      // console.log("chats.upsert", { data });
    });

    socket.ev.on("chats.update", (data) => {
      void this.handleChatUpdate(sessionId, data);
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

  private async handleHistoryLoad(
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

    console.log("hasUser", Boolean(user), { user });

    if (!user) return;

    const newChats: WhatsappChat[] = [];

    for (const chat of data.chats) {
      const whatsappId = chat?.id;

      console.log(
        "data.chats => hasWhatsappId",
        Boolean(whatsappId),
        whatsappId,
      );

      if (!whatsappId) continue;

      const contact = data?.contacts?.find((contact) => {
        return chat.id === contact.id;
      });

      const phoneNumber = this.getPhoneNumberFromJid(
        contact?.phoneNumber ?? "",
      );

      console.log(
        "data.chats => hasPhoneNumber",
        Boolean(phoneNumber),
        phoneNumber,
      );

      if (!phoneNumber) continue;

      newChats.push(
        this.chatRepository.create({
          phoneNumber,
          name: contact?.notify ?? "Desconhecido",
          whatsappId,
          user,
          unread: (chat?.unreadCount ?? 0) > 0,
        }),
      );

      console.log("data.chats => pushed successfully");
    }

    console.log("data.chats => upsert", { newChats });

    await this.chatRepository.upsert(newChats, ["whatsappId", "user.id"]);

    for (const message of data.messages) {
      const whatsappId = message?.key?.remoteJid;

      if (!whatsappId) continue;

      const chat = await this.chatRepository.findOne({
        where: { whatsappId, user: { id: user.id } },
      });

      if (!chat) continue;

      const messageId = message?.key?.id as string;
      const sentAt = message?.messageTimestamp
        ? dayjs.unix(message.messageTimestamp as number).toDate()
        : new Date();
      const content = message?.message?.conversation ?? "";
      const type = this.getMessageType(message?.message) as string;
      const me = !!message?.key?.fromMe;

      void this.messageRepository.upsert(
        {
          chat,
          messageId,
          sentAt: sentAt?.toISOString(),
          content,
          type,
          me,
        },
        {
          conflictPaths: ["messageId"],
          skipUpdateIfNoValuesChanged: true,
        },
      );
    }
  }

  private async handleChatUpdate(sessionId: string, data: Chat[]) {
    const user = await this.getUsers(sessionId);

    for (const chatData of data) {
      const whatsappId = chatData?.id;

      if (!whatsappId) continue;

      const phoneNumber = this.getPhoneNumberFromJid(
        // @ts-expect-error: missing types
        chatData?.messages?.[0]?.message?.key?.remoteJid,
        // @ts-expect-error: missing types
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        chatData?.messages?.[0]?.message?.key?.remoteJidAlt,
      );

      const name =
        chatData?.name ??
        chatData?.messages?.[0]?.message?.pushName ??
        "Desconhecido";

      const unread = (chatData?.unreadCount ?? 0) > 0;

      await this.chatRepository.upsert(
        {
          phoneNumber,
          name,
          whatsappId,
          user,
          unread,
        },
        ["whatsappId", "user.id"],
      );

      const chatRecord = await this.chatRepository.findOne({
        where: { whatsappId, user: { id: user.id } },
      });

      if (!chatRecord) continue;

      const messagesToUpsert = (chatData?.messages ?? []).map((message) => {
        const content = message?.message?.message?.conversation ?? "";
        const messageId = message?.message?.key?.id as string;
        const sentAt = message?.message?.messageTimestamp
          ? dayjs.unix(message.message.messageTimestamp as number).toDate()
          : new Date();
        const type = this.getMessageType(message?.message?.message) as string;

        return this.messageRepository.create({
          sentAt: sentAt.toISOString(),
          content,
          messageId,
          whatsappId: message?.message?.key?.remoteJid as string,
          type,
          me: !!message?.message?.key?.fromMe,
          chat: chatRecord,
        });
      });

      if (messagesToUpsert.length > 0) {
        await this.messageRepository.upsert(messagesToUpsert, {
          conflictPaths: ["messageId"],
          skipUpdateIfNoValuesChanged: true,
        });
      }
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

  private getMessageType(message: IMessage | null | undefined) {
    if (!message) {
      return "unknown";
    }
    if (message.conversation) {
      return "text";
    }
    if (message.imageMessage) {
      return "image";
    }
    if (message.videoMessage) {
      return "video";
    }
    if (message.audioMessage) {
      return "audio";
    }
    if (message.documentMessage) {
      return "document";
    }
    if (message.stickerMessage) {
      return "sticker";
    }
    if (message.locationMessage) {
      return "location";
    }
    if (message.eventMessage) {
      return "event";
    }
  }

  private getPhoneNumberFromJid(jid: string, jidAlt?: string): string | null {
    const idWhatsApp = "@s.whatsapp.net";
    if (jid?.includes(idWhatsApp)) {
      return jid?.replaceAll(idWhatsApp, "")?.slice(2, 1000);
    }
    if (jidAlt?.includes(idWhatsApp)) {
      return jidAlt?.replaceAll(idWhatsApp, "")?.slice(2, 1000);
    }
    return null;
  }
}
