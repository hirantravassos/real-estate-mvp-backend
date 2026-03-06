import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
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
import { join } from "path";
import { existsSync, mkdirSync, promises as fs } from "node:fs";
import { WhatsappEventProcessorService } from "./whatsapp-event-processor.service";
import { User } from "../../users/entities/user.entity";
import { UserRepository } from "../../users/repositories/user.repository";
import { WhatsappConnectionStatusEnum } from "../enums/whatsapp-connection-status.enum";
import { WhatsappSessionService } from "./whatsapp-session.service";

@Injectable()
export class WhatsappSocketService implements OnModuleInit {
  private readonly sockets = new Map<string, WASocket>();
  private readonly sessionsDir = join(process.cwd(), "sessions");

  constructor(
    private readonly userRepository: UserRepository,
    @Inject(forwardRef(() => WhatsappSessionService))
    private readonly sessionService: WhatsappSessionService,
    private readonly eventProcessor: WhatsappEventProcessorService,
  ) {
    if (!existsSync(this.sessionsDir)) {
      mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  async onModuleInit(): Promise<void> {
    const users = await this.userRepository.find({
      where: { active: true },
      relations: {
        session: true,
      },
    });

    for (const user of users) {
      const sessionId = user.session?.id;
      if (!sessionId) continue;
      await this.start(sessionId, user).catch((error) => {
        console.error("Initial boot failed for " + sessionId, error);
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
      console.log("EVENT messages.upsert", data);
      void this.eventProcessor.processMessageUpsert(
        user,
        selfName,
        data.messages,
      );
    });

    socket.ev.on("messages.update", (data) => {
      console.log("EVENT messages.update", data);
      void this.eventProcessor.processMessageUpdate(user, data);
    });

    socket.ev.on("chats.upsert", (data) => {
      console.log("chats.upsert CHAT CREATED", data);
      void this.eventProcessor.processChats(user, data);
    });

    socket.ev.on("chats.update", (data) => {
      console.log("chats.update CHAT UPDATED", data);
      void this.eventProcessor.processChats(user, data);
    });

    socket.ev.on("call", (data) => {
      console.log("call", data);
    });

    socket.ev.on("lid-mapping.update", (data) => {
      console.log("lid-mapping.update NO IDEA", data);
      console.log("lid-mapping.update", data);
    });

    socket.ev.on("presence.update", () => {
      // console.log("presence.update PERSON IS TYPING", data);
      // Show if a person is typing something to the user
    });

    socket.ev.on("contacts.upsert", (data) => {
      void this.eventProcessor.processContacts(user, data);
    });

    socket.ev.on("contacts.update", (data) => {
      void this.eventProcessor.processContacts(user, data);
    });

    socket.ev.on("connection.update", (data) => {
      void this.handleConnectionUpdate(sessionId, user, data);
    });
  }

  public getSocketOrFail(sessionId?: string | null): WASocket {
    if (!sessionId) {
      throw new NotFoundException("Session not found");
    }
    const found = this.sockets.get(sessionId);

    if (!found) {
      throw new NotFoundException("Socket not found");
    }

    return found;
  }

  public async getSocketByUserOrFail(
    userId?: string | null,
  ): Promise<WASocket> {
    if (!userId) {
      throw new BadRequestException("User not provided");
    }
    const session = await this.sessionService.findOneByUserId(userId);
    if (!session) {
      throw new NotFoundException("Session not found");
    }
    return this.getSocketOrFail(session?.id);
  }

  public async destroySession(
    sessionId: string,
    statusCode?: number,
  ): Promise<void> {
    const sessionPath = join(this.sessionsDir, sessionId);

    await fs.rm(sessionPath, { recursive: true, force: true });

    console.warn(
      `Session ${sessionId} KILLED (Code: ${statusCode}). DB record and files removed.`,
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

  private handleConnectionUpdate(
    sessionId: string,
    user: User,
    update: Partial<ConnectionState>,
  ) {
    const { lastDisconnect, qr } = update;

    const connection = update.connection;
    const socket = this.getSocketOrFail(sessionId);

    if (connection === "open") {
      void this.sessionService.save(user, {
        status: WhatsappConnectionStatusEnum.CONNECTED,
      });
      return;
    }

    if (connection === "connecting") {
      void this.sessionService.save(user, {
        status: WhatsappConnectionStatusEnum.CONNECTING,
        name: socket?.authState?.creds?.me?.name ?? user.name,
      });
      return;
    }

    if (qr) {
      void this.sessionService.save(user, {
        qr: qr ?? null,
        name: socket?.authState?.creds?.me?.name ?? user.name,
      });
      return;
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;

      const isTerminal =
        statusCode === 401 || statusCode === 405 || statusCode === 411;

      if (isTerminal) {
        this.destroySession(sessionId, statusCode).catch(console.error);
        setTimeout(() => {
          this.start(sessionId, user).catch(console.error);
        }, 1000);
        return;
      }

      this.start(sessionId, user).catch(console.error);
    }
  }
}
