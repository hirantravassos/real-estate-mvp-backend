import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import WAWebJS, { Client, LocalAuth, WAState } from "whatsapp-web.js";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "../../users/entities/user.entity";
import { WhatsappChat } from "../entities/whatsapp-chat.entity";
import { WhatsappChatMapper } from "../mappers/whatsapp-chat.mapper";
import { WhatsappStatus } from "../entities/whatsapp-status.entity";
import { WhatsappClientStatusEnum } from "../enums/whatsapp-client-status.enum";
import { join } from "node:path";
import { existsSync, rmSync } from "fs";

interface WhatsappStatusDto {
  status: WhatsappClientStatusEnum;
  qr?: string | null;
  isSyncing: boolean;
  hasUpdates: boolean;
}

@Injectable()
export class WhatsappClientService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappClientService.name);
  private clients: Map<string, Client> = new Map();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(WhatsappChat)
    private readonly whatsappChatRepository: Repository<WhatsappChat>,
    @InjectRepository(WhatsappStatus)
    private readonly whatsappStatusRepository: Repository<WhatsappStatus>,
  ) {}

  async onModuleInit() {
    await this.clearAllStatuses();
    await this.restoreAllSessions();
  }

  private async clearAllStatuses() {
    this.logger.log("Cleaning up stale WhatsApp statuses...");
    await this.whatsappStatusRepository.update(
      {},
      {
        qr: null,
        isSyncing: false,
        status: WhatsappClientStatusEnum.ERROR,
      },
    );
  }

  requestConnection(user: User) {
    const clientId: string = user.id;

    if (this.clients.has(clientId)) {
      void this.restoreSession(clientId);

      return {
        success: true,
        message: "Client already initializing or ready.",
      };
    }

    void this.initializeClient(clientId);
  }

  async requestLogout(userId: string) {
    this.logger.log(`[${userId}] Client was logged out by user request`);

    void this.updateConnectionStatus(userId, {
      status: WhatsappClientStatusEnum.ERROR,
      qr: null,
    });

    const sessionRoot: string =
      process.env.WHATSAPP_SESSION_PATH || join(process.cwd(), ".wwebjs_auth");
    const sessionPath: string = join(sessionRoot, `session-${userId}`);

    if (existsSync(sessionPath)) {
      try {
        this.logger.log(
          `[${userId}] Destroying session files at ${sessionPath}`,
        );
        rmSync(sessionPath, { recursive: true, force: true });
      } catch (err) {
        this.logger.error(
          `[${userId}] Failed to delete session folder: ${err}`,
        );
      }
    }

    const client = this.clients.get(userId);

    if (client) {
      try {
        await client.logout();
        await client.destroy(); // Properly close the browser process
      } catch (err) {
        this.logger.warn(
          `[${userId}] Error during client logout/destroy: ${err}`,
        );
      } finally {
        this.clients.delete(userId);
      }
    }
  }

  async getClientOrThrow(user: User): Promise<Client> {
    const client = this.clients.get(user.id);

    if (!client) {
      throw new NotFoundException(`Client not found for user: ${user.id}`);
    }

    const state = await this.waitForConnected(client, user.id);

    if (state !== WAState.CONNECTED) {
      throw new ServiceUnavailableException(
        `WhatsApp client is not ready (current state: ${state}). Please try again in a few seconds.`,
      );
    }

    void this.updateConnectionStatus(user.id, {
      status: WhatsappClientStatusEnum.CONNECTED,
    });

    return client;
  }

  private async waitForConnected(
    client: Client,
    userId: string,
    maxRetries = 5,
  ): Promise<WAState | null> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const state = await client.getState();
        if (state === WAState.CONNECTED) return state;

        this.logger.log(
          `[${userId}] Waiting for connection... attempt ${i + 1}/${maxRetries} (state: ${state})`,
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `[${userId}] Client state check failed: ${errorMessage}`,
        );
      }

      await new Promise((resolve) =>
        setTimeout(resolve, i === 0 ? 2000 : 5000),
      );
    }

    // Final attempt
    return client.getState().catch(() => null);
  }

  async syncChat(chat: WAWebJS.Chat, user: User) {
    if (chat.isGroup) {
      this.logger.log(
        `[${user.id}]`,
        `Skipped chat (group): ${chat.id._serialized}`,
      );
      return;
    }

    const contact = await chat.getContact().catch(() => null);

    if (!contact) {
      this.logger.warn(
        `[${user.id}]`,
        "Syncing chat failed: getContact failure",
      );
      return;
    }

    const profile = await contact.getProfilePicUrl().catch(() => null);
    const entity = WhatsappChatMapper.toEntity(
      {
        ...chat,
        contact,
        profile,
      },
      user,
    );
    // this.logger.log(`[${user.id}]`, `Syncing chat: ${entity.id}`);
    await this.whatsappChatRepository.upsert(entity, ["user", "id"]);
  }

  private async syncChats(userId: string, client: WAWebJS.Client) {
    const user = await this.userRepository.findOneBy({ id: userId });

    if (!user) {
      this.logger.error("syncChats.error", "user not found", { userId });
      return;
    }

    void this.updateConnectionStatus(user.id, {
      isSyncing: true,
    });

    const chats = await client.getChats();

    const syncPromises: Promise<void>[] = chats.map((chat) =>
      this.syncChat(chat, user),
    );

    void Promise.all(syncPromises).finally(() => {
      void this.updateConnectionStatus(userId, {
        isSyncing: false,
        hasUpdates: true,
      });
    });
  }

  private async syncMessage(userId: string, message: WAWebJS.Message) {
    const user = await this.userRepository.findOneBy({ id: userId });

    if (!user) return;

    const chat = await message.getChat().catch(() => null);

    if (!chat) {
      this.logger.error(
        `[${user.id}]`,
        `Syncing chat from message failed: ${message.id._serialized}`,
      );
      return;
    }

    this.logger.log(
      `[${user.id}]`,
      `Syncing chat from message: ${chat.id._serialized}`,
    );
    void this.syncChat(chat, user);
  }

  private async restoreAllSessions(): Promise<void> {
    this.logger.log("Restoring previous WhatsApp sessions...");

    const users = await this.userRepository.find();

    for (const user of users) {
      const sessionRoot: string =
        process.env.WHATSAPP_SESSION_PATH ||
        join(process.cwd(), ".wwebjs_auth");
      const sessionPath: string = join(sessionRoot, `session-${user.id}`);

      if (existsSync(sessionPath)) {
        void this.restoreSession(user.id);
        this.logger.log(`Restoring session for ${user.id}...`);
        // Wait a bit between restorations to avoid heavy CPU load
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        this.logger.log(
          `No session found for ${user.id}, skipping restoration.`,
        );
      }
    }
  }

  private restoreSession(clientId: string): void {
    this.logger.log(`Restoring session for: ${clientId}`);
    void this.initializeClient(clientId);
  }

  private async updateConnectionStatus(
    userId: string,
    dto: Partial<WhatsappStatusDto>,
  ) {
    await this.whatsappStatusRepository.upsert(
      {
        user: { id: userId },
        ...dto,
      },
      ["user"],
    );
  }

  private async initializeClient(clientId: string): Promise<void> {
    this.logger.log(`[${clientId}] Initializing client...`);

    const user = await this.userRepository.findOneBy({ id: clientId });

    if (!user) {
      this.logger.warn(
        `[${clientId}] While initializing client, user not found. Skipping...`,
      );
      return;
    }

    const sessionRoot: string =
      process.env.WHATSAPP_SESSION_PATH || join(process.cwd(), ".wwebjs_auth");
    const clientSessionPath: string = join(sessionRoot, `session-${clientId}`);
    const lockPath: string = join(clientSessionPath, "SingletonLock");

    if (existsSync(lockPath)) {
      try {
        this.logger.log(`[${clientId}] Removing stale browser lock...`);
        rmSync(lockPath, { force: true });
      } catch (err) {
        this.logger.warn(`[${clientId}] Could not remove lock: ${err}`);
      }
    }

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: clientId,
        dataPath: sessionRoot,
      }),
      puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ?? undefined,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-zygote",
          "--disable-extensions",
          "--disable-component-update",
          "--no-first-run",
        ],
      },
    });

    // this.logger.debug(`[${clientId}] Client created.`, {
    //   client,
    //   webVersion: await client.getWWebVersion().catch(() => null),
    // });

    this.clients.set(clientId, client);

    client.on("qr", (qr: string) => {
      void this.updateConnectionStatus(clientId, {
        status: WhatsappClientStatusEnum.PENDING,
        qr,
      });
    });

    client.on("ready", () => {
      void this.updateConnectionStatus(clientId, {
        status: WhatsappClientStatusEnum.CONNECTED,
      });
      void this.syncChats(clientId, client);
    });

    client.on("message", (message) => {
      void this.updateConnectionStatus(clientId, {
        hasUpdates: true,
      });
      void this.syncMessage(clientId, message);
    });

    client.on("unread_count", (chat) => {
      void this.updateConnectionStatus(clientId, {
        status: WhatsappClientStatusEnum.CONNECTED,
        hasUpdates: true,
      });
      void this.syncChat(chat, user);
    });

    client.on("authenticated", () => {
      void this.updateConnectionStatus(clientId, {
        status: WhatsappClientStatusEnum.AUTHENTICATED,
      });
      this.logger.log(`[${clientId}] Session authenticated.`);
    });

    client.on("auth_failure", (message: string) => {
      this.logger.warn(`[${clientId}] Authentication failure: ${message}`);
      void this.updateConnectionStatus(clientId, {
        status: WhatsappClientStatusEnum.ERROR,
      });
      this.clients.delete(clientId);
    });

    client.on("disconnected", (reason: string) => {
      this.logger.warn(`[${clientId}] Client was logged out: ${reason}`);
      void this.updateConnectionStatus(clientId, {
        status: WhatsappClientStatusEnum.ERROR,
        qr: null,
      });
      this.clients.delete(clientId);
    });

    void client.initialize().catch((error) => {
      this.logger.error(`[${clientId}] Initialization error:`, error);
    });
  }
}
