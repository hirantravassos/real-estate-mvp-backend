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
  Contact,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  WASocket,
} from "@whiskeysockets/baileys";
import { join } from "path";
import * as fs from "node:fs";
import { existsSync, mkdirSync } from "node:fs";
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

  async start(sessionId: string, user: User): Promise<void> {
    const socket = await this.createSocket(sessionId);

    socket.ev.on("messaging-history.set", (data) => {
      void this.eventProcessor.processHistorySync(user, data);
    });

    socket.ev.on("messages.upsert", (data) => {
      console.log("EVENT messages.upsert", JSON.stringify(data));
      void this.eventProcessor.processMessages(user, data.messages);
    });

    socket.ev.on("messages.update", (data) => {
      console.log("EVENT messages.update", data);
      void this.eventProcessor.processMessageUpdate(user, data);
    });

    socket.ev.on("chats.upsert", (data) => {
      console.log("chats.upsert CHAT CREATED", data);
      void this.eventProcessor.processChatsSync(user, data);
    });

    socket.ev.on("chats.update", (data) => {
      console.log("chats.update CHAT UPDATED", JSON.stringify(data));
      void this.eventProcessor.processChatsSync(user, data);
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
      void this.eventProcessor.processContactsSync(user, data);
    });

    socket.ev.on("contacts.update", (data) => {
      void this.eventProcessor.processContactsSync(user, data as Contact[]);
    });

    socket.ev.on("connection.update", (data) => {
      console.warn("connection.update", JSON.stringify(data));
      void this.handleConnectionUpdate(sessionId, user, data);
    });

    socket.ev.on("creds.update", (data) => {
      console.warn("creds.update", JSON.stringify(data));
    });
  }

  getSocketOrFail(sessionId?: string | null): WASocket {
    if (!sessionId) {
      throw new NotFoundException("Session not found");
    }
    const found = this.sockets.get(sessionId);

    if (!found) {
      throw new NotFoundException("Socket not found");
    }

    return found;
  }

  async getSocketByUserOrFail(userId?: string | null): Promise<WASocket> {
    if (!userId) {
      throw new BadRequestException("User not provided");
    }
    const session = await this.sessionService.findOneByUserId(userId);
    if (!session) {
      throw new NotFoundException("Session not found");
    }
    return this.getSocketOrFail(session?.id);
  }

  async logout(user: User): Promise<void> {
    const socket = await this.getSocketByUserOrFail(user.id);
    await socket.logout();
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
    try {
      const { isOnline, qr, lastDisconnect, isNewLogin } = update;

      const connection = update.connection;
      const socket = this.getSocketOrFail(sessionId);
      const sessionPath = join(this.sessionsDir, sessionId);

      if (isOnline) {
        void this.sessionService.save(user, {
          status: WhatsappConnectionStatusEnum.CONNECTED,
        });
        return;
      }

      if (isNewLogin) {
        this.start(sessionId, user).catch(console.error);
        return;
      }

      if (qr) {
        void this.sessionService.save(user, {
          qr: qr ?? null,
          name: socket?.authState?.creds?.me?.name ?? user.name,
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

      if (connection === "close") {
        const isUnauthenticated =
          // @ts-expect-error: missing types
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          lastDisconnect?.error?.output?.statusCode === 401;

        if (isUnauthenticated) {
          void this.sessionService.save(user, {
            qr: null,
            status: WhatsappConnectionStatusEnum.CLOSED,
          });

          fs.promises
            .rm(sessionPath, { recursive: true, force: true })
            .then(() => {
              console.log(`Restarting session files for ${sessionId}`);
            })
            .catch((err) => {
              console.error(
                `Failed to delete session files for ${sessionId}`,
                err,
              );
            })
            .finally(() => {
              this.start(sessionId, user).catch(console.error);
            });
          // this.start(sessionId, user).catch(console.error);
          return;
        }

        //   const sessionPath = join(this.sessionsDir, sessionId);
        //
        //   socket?.logout().catch(() => null);
        //   this.sockets.delete(sessionId);
        //   void this.sessionService.save(user, {
        //     status: WhatsappConnectionStatusEnum.CLOSED,
        //   });
        //
        //   fs.promises
        //     .rm(sessionPath, { recursive: true, force: true })
        //     .then(() => {
        //       console.log(`Restarting session files for ${sessionId}`);
        //     })
        //     .catch((err) => {
        //       console.error(
        //         `Failed to delete session files for ${sessionId}`,
        //         err,
        //       );
        //     })
        //     .finally(() => {
        //       this.start(sessionId, user).catch(console.error);
        //     });
      }
    } catch (error) {
      console.error("Error handling connection update for " + sessionId, error);
      setTimeout(() => {
        void this.start(sessionId, user);
      }, 5000);
    }
  }
}
