import {
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from "@nestjs/common";
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
import { WhatsappConnectionStatusEnum } from "../enums/whatsapp-connection-status.enum";
import { WhatsappEventProcessorService } from "./whatsapp-event-processor.service";
import { User } from "../../users/entities/user.entity";

@Injectable()
export class WhatsappSocketService implements OnModuleInit {
  private readonly sockets = new Map<string, WASocket>();
  private readonly sessionsDir = join(process.cwd(), "sessions");

  constructor(
    private readonly sessionRepository: WhatsappSessionRepository,
    private readonly eventProcessor: WhatsappEventProcessorService,
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
      const user = await this.findUserBySessionId(session.id);
      await this.start(session.id, user).catch((error) => {
        console.error("Initial boot failed for " + session.id, error);
      });
    }
  }

  public async start(sessionId: string, user: User): Promise<void> {
    const socket = await this.createSocket(sessionId);
    const selfName = socket.authState?.creds?.me?.name ?? "";

    socket.ev.on("messaging-history.set", (data) => {
      void this.eventProcessor.processHistorySync(user, selfName, data);
    });

    socket.ev.on("messages.upsert", (data) => {
      void this.eventProcessor.processMessageUpsert(
        user,
        selfName,
        data.messages,
      );
    });

    socket.ev.on("messages.update", (data) => {
      void this.eventProcessor.processMessageUpdate(user, selfName, data);
    });

    socket.ev.on("chats.upsert", (data) => {
      void this.eventProcessor.processChats(user, data);
    });

    socket.ev.on("chats.update", (data) => {
      void this.eventProcessor.processChats(user, data);
    });

    socket.ev.on("contacts.upsert", (data) => {
      void this.eventProcessor.processContacts(user, data);
    });

    socket.ev.on("contacts.update", (data) => {
      void this.eventProcessor.processContacts(user, data);
    });

    socket.ev.on("connection.update", (data) => {
      void this.handleConnectionUpdate(sessionId, data);
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
      { id: sessionId },
      { status: WhatsappConnectionStatusEnum.CLOSED },
    );

    console.warn(
      `Session ${sessionId} OBLITERATED (Code: ${statusCode}). DB record and files removed.`,
    );
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

  private async handleConnectionUpdate(
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

      const user = await this.findUserBySessionId(sessionId);
      this.start(sessionId, user).catch(console.error);
    }
  }

  private async findUserBySessionId(sessionId: string): Promise<User> {
    const { user } = await this.sessionRepository
      .findOneOrFail({
        where: { id: sessionId },
        relations: { user: true },
      })
      .catch(() => {
        throw new InternalServerErrorException(
          "findUserBySessionId: Session not found",
        );
      });
    return user;
  }
}
