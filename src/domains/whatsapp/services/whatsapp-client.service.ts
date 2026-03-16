import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import WAWebJS, { Client, RemoteAuth, WAState } from "whatsapp-web.js";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "../../users/entities/user.entity";
import { WhatsappChat } from "../entities/whatsapp-chat.entity";
import { WhatsappChatMapper } from "../mappers/whatsapp-chat.mapper";
import { WhatsappStatus } from "../entities/whatsapp-status.entity";
import { WhatsappClientStatusEnum } from "../enums/whatsapp-client-status.enum";
import { MongoStore } from "wwebjs-mongo";
import { connect, connection, ConnectionStates } from "mongoose";
import { join } from "path";
import * as fs from "fs/promises";

interface WhatsappStatusDto {
  status: WhatsappClientStatusEnum;
  qr?: string | null;
  isSyncing: boolean;
  hasUpdates: boolean;
}

@Injectable()
class WhatsappClientService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappClientService.name);
  private clients: Map<string, Client> = new Map();
  private mongoStore: any;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(WhatsappChat)
    private readonly whatsappChatRepository: Repository<WhatsappChat>,
    @InjectRepository(WhatsappStatus)
    private readonly whatsappStatusRepository: Repository<WhatsappStatus>,
  ) {}

  async onModuleInit() {
    await this.initializeMongoStore();
    await this.clearAllStatuses();

    const users = await this.userRepository.find();
    for (const user of users) {
      void this.initializeClient(user);
    }
  }

  async wipeUserSession(userId: string): Promise<void> {
    this.logger.warn(`[${userId}] Wiping all session data...`);

    const existingClient = this.clients.get(userId);

    if (existingClient) {
      try {
        await existingClient.destroy();
      } catch (error) {
        this.logger.error(
          `[${userId}] Error destroying client during wipe: ${error}`,
        );
      }
      this.clients.delete(userId);
    }

    const userAuthPath = join(process.cwd(), ".wwebjs_auth", userId);
    await fs
      .rm(userAuthPath, { recursive: true, force: true })
      .catch(() => null);

    if (this.mongoStore) {
      try {
        // eslint-disable-next-line
        await this.mongoStore.delete({ session: userId });
        this.logger.log(`[${userId}] MongoDB session deleted`);
      } catch (error) {
        this.logger.error(
          `[${userId}] Failed to delete Mongo session: ${error}`,
        );
      }
    }

    await this.updateConnectionStatus(userId, {
      status: WhatsappClientStatusEnum.ERROR,
      qr: null,
      isSyncing: false,
    });
  }

  requestConnection(user: User) {
    const clientId: string = user.id;

    if (this.clients.has(clientId)) {
      // void this.restoreSession(clientId);

      return {
        success: true,
        message: "Client already initializing or ready.",
      };
    }

    void this.initializeClient(user);
  }

  async requestLogout(userId: string) {
    this.logger.log(`[${userId}] Client was logged out by user request`);

    void this.updateConnectionStatus(userId, {
      status: WhatsappClientStatusEnum.ERROR,
      hasUpdates: false,
      isSyncing: false,
      qr: null,
    });

    const client = this.clients.get(userId);
    if (client) {
      try {
        await client.logout();
        await client.destroy();
      } catch (err) {
        this.logger.warn(`[${userId}] Error during logout: ${err}`);
      } finally {
        this.clients.delete(userId);
      }
    }
  }

  async getClientOrThrow(user: User): Promise<Client> {
    const client = this.clients.get(user.id);

    if (!client)
      throw new NotFoundException(`Client not found for user: ${user.id}`);

    const state = await this.waitForConnected(client, user.id);

    if (state !== WAState.CONNECTED) {
      throw new ServiceUnavailableException("WhatsApp client is not ready.");
    }

    void this.updateConnectionStatus(user.id, {
      status: WhatsappClientStatusEnum.CONNECTED,
    });

    return client;
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

  async syncChats(userId: string, client: WAWebJS.Client) {
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

  async syncMessage(userId: string, message: WAWebJS.Message) {
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

  private async clearAllStatuses() {
    this.logger.log("Cleaning up stale WhatsApp statuses...");

    const users = await this.userRepository.find();

    for (const user of users) {
      await this.whatsappStatusRepository.update(
        { user: { id: user.id } },
        {
          qr: null,
          isSyncing: false,
          status: WhatsappClientStatusEnum.ERROR,
        },
      );
    }
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

  private async initializeMongoStore(): Promise<void> {
    const user = encodeURIComponent(process.env.MONGO_USERNAME as string);
    const pass = encodeURIComponent(process.env.MONGO_PASSWORD as string);
    const host = process.env.MONGO_HOST;
    const port = process.env.MONGO_PORT;
    const db = process.env.MONGO_NAME;
    const uri = `mongodb://${user}:${pass}@${host}:${port}/${db}?authSource=admin`;

    if (connection.readyState === ConnectionStates.disconnected) {
      await connect(uri);
    }

    // eslint-disable-next-line
    this.mongoStore = new MongoStore({ mongoose: { connection } });
    this.logger.log("MongoStore ready");
  }

  private async initializeClient(user: User): Promise<void> {
    const clientId: string = user.id;

    if (this.clients.has(clientId)) return;

    this.logger.log(`[${clientId}] Starting cold boot...`);

    const client = new Client({
      authStrategy: new RemoteAuth({
        clientId: clientId,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        store: this.mongoStore,
        backupSyncIntervalMs: 300000,
        dataPath: join(process.cwd(), ".wwebjs_auth", clientId),
      }),
      // CRITICAL: Prevents "Execution context was destroyed" by locking the web version
      webVersionCache: {
        type: "remote",
        remotePath:
          "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1018905252-alpha.html",
      },
      puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      },
    });

    this.initializeListener(clientId, client, user);

    try {
      await client.initialize();
      this.clients.set(clientId, client);
    } catch (error) {
      this.logger.error(`[${clientId}] Initialization failed: ${error}`);
      this.clients.delete(clientId);
    }
  }

  private initializeListener(
    clientId: string,
    client: Client,
    user: User,
  ): void {
    this.logger.log(`[${clientId}] Attaching listeners...`);

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

    client.on("remote_session_saved", () => {
      this.logger.log(
        `[${clientId}] Session successfully persisted to MongoDB!`,
      );
    });
  }
}

export default WhatsappClientService;
