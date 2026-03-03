import {
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from "@nestjs/common";
import makeWASocket, {
  Browsers,
  BufferedEventData,
  ConnectionState,
  fetchLatestBaileysVersion,
  proto,
  useMultiFileAuthState,
  WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import * as qrcode from "qrcode-terminal";
import { join } from "path";
import { existsSync, mkdirSync, promises as fs } from "node:fs";
import { WhatsappSessionRepository } from "../repositories/whatsapp-session.repository";
import { WhatsappConnectionStatusEnum } from "../enums/whatsapp-connection-status.enum";
import { WhatsappChat } from "../entities/whatsapp-chat.entity";
import { WhatsappChatRepository } from "../repositories/whatsapp-chat.repository";

@Injectable()
export class WhatsappSocketService implements OnModuleInit {
  private readonly sockets = new Map<string, WASocket>();
  private readonly sessionsDir = join(process.cwd(), "sessions");

  constructor(
    private readonly sessionRepository: WhatsappSessionRepository,
    private readonly chatRepository: WhatsappChatRepository,
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

    // socket.ev.on("messaging-history.set", (data) => {
    //   void this.messageHistorySet(sessionId, data);
    // });

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

    socket.ev.on("contacts.upsert", (data) => {
      console.log("contacts.upsert", { data });
    });

    socket.ev.on("contacts.update", (data) => {
      console.log("contacts.update", { data });
      // const contacts = data?.map((item) => {
      //   return {
      //     name: item?.verifiedName ?? item?.notify ?? "Desconhecido",
      //     whatsappId: item?.id,
      //   };
      // });
      // void this.contactRepository.save(contacts);
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

  private async handleChatUpdate(
    sessionId: string,
    data: Partial<
      proto.IConversation & {
        lastMessageRecvTimestamp?: number;
      } & {
        conditional: (bufferedData: BufferedEventData) => boolean | undefined;
        timestamp?: number;
      }
    >[],
  ) {
    // console.log("chats.update", { data });
    const user = await this.getUsers(sessionId);

    const newChats: WhatsappChat[] = [];

    const chats = data?.forEach((item) => {
      console.log("chats.update.item", { item });

      const phoneNumber = this.getPhoneNumberFromJid(
        // @ts-expect-error: missing types
        item?.messages?.[0]?.message?.key?.remoteJid,
        // @ts-expect-error: missing types
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        item?.messages?.[0]?.message?.key?.remoteJidAlt,
      );

      const name =
        item?.name ?? item?.messages?.[0]?.message?.pushName ?? "Desconhecido";

      const whatsappId = item?.id;

      const unread = item?.unreadMentionCount
        ? item?.unreadMentionCount > 0
        : false;

      if (!whatsappId) {
        return;
      }

      newChats.push(
        this.chatRepository.create({
          phoneNumber,
          name,
          whatsappId,
          user,
          unread,
        }),
      );
    });

    void this.chatRepository
      .save(newChats)
      .catch(() => console.error("duplicated"));

    console.log({ chats });
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

  private getPhoneNumberFromJid(jid: string, jidAlt: string): string | null {
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
