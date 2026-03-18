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

    const users = await this.userRepository.find();
    for (const user of users) {
      void this.initializeClient(user).catch(() => {
        void this.whatsappStatusRepository.update(
          { userId: user.id },
          {
            status: WhatsappClientStatusEnum.ERROR,
          },
        );
      });
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
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
        await this.whatsappChatRepository.delete({
          userId,
        });
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

  async syncSelfProfileImage(user: User, client: WAWebJS.Client) {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const selfContactId = client.info.wid._serialized;
    const profileImage = await client
      .getProfilePicUrl(selfContactId)
      ?.catch(() => null);

    if (profileImage) {
      await this.userRepository.update({ id: user.id }, { profileImage });
    }
  }

  async syncChat(chat: WAWebJS.Chat, user: User) {
    if (chat.isGroup) return;

    if (!chat.lastMessage || chat.lastMessage?.fromMe) {
      const messages: WAWebJS.Message[] = await chat
        .fetchMessages({ limit: 10 })
        .catch(() => []);
      if (messages?.length > 0 && messages?.[0]?.timestamp) {
        chat.lastMessage = messages?.filter((item) => {
          return !item?.fromMe;
        })[0];
      }
    }

    const contact = await chat.getContact().catch(() => null);

    if (!contact) {
      this.logger.warn(`[${user.id}] Syncing chat failed: getContact failure`, {
        chat,
      });
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    const profile: string | null = await contact
      .getProfilePicUrl()
      .catch(() => null);

    if (!contact) {
      this.logger.warn(
        `[${user.id}]`,
        "Syncing chat failed: getContact failure",
      );
      return;
    }

    const entity = WhatsappChatMapper.toEntity(
      {
        ...chat,
        contact,
        profile,
      },
      user,
    );

    const can = () => {
      if (!entity?.lastMessage) return false;
      if (!entity?.name || entity?.name === "") return false;
      if (!entity?.phone || entity?.phone === "") return false;
      return true;
    };

    const canProceed = can();

    if (!canProceed) {
      // this.logger.warn(`[${user.id}] Syncing chat failed: can() is false`, {
      //   lastMessage: !!entity?.lastMessage,
      //   chatLastMessage: chat?.lastMessage?.timestamp,
      //   name: !!entity?.name,
      //   phone: !!entity?.phone,
      // });
      return;
    }

    await this.whatsappChatRepository.upsert(entity, ["userId", "id"]);
  }

  async syncAllChats(userId: string, client: WAWebJS.Client) {
    const user = await this.userRepository.findOneBy({ id: userId });

    if (!user) {
      this.logger.error("syncChats.error", "user not found", { userId });
      return;
    }

    void this.updateConnectionStatus(user.id, { isSyncing: true });

    await new Promise((resolve) => setTimeout(resolve, 10000));

    const chats = await client.getChats().catch(() => {
      this.logger.error(
        `[${userId}]`,
        "Syncing chats failed: getChats failure",
      );
      return [];
    });
    const syncChats: WAWebJS.Chat[] = [];

    this.logger.log(`[${userId}] Found ${chats.length} chats to sync.`);

    const syncPromises: Promise<void>[] = chats.map(async (chat) => {
      try {
        void this.updateConnectionStatus(userId, { hasUpdates: true });

        await this.syncChat(chat, user);

        syncChats.push(chat);
      } catch (error) {
        this.logger.warn(
          `[${userId}] Syncing chat failed ${chat?.id?._serialized}: ${error}`,
        );
      } finally {
        void this.updateConnectionStatus(userId, { hasUpdates: true });
      }
    });

    await Promise.all(syncPromises).finally(() => {
      this.logger.log(
        `[${userId}] ${syncChats.length} of ${chats.length} chats synced.`,
      );
      this.printSyncReport(userId, syncChats, chats);
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
      `[${user.id}] Syncing chat from message: ${chat.id._serialized}`,
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
          status: WhatsappClientStatusEnum.RELOADING,
        },
      );
    }
  }

  private printSyncReport(
    userId: string,
    syncChats: WAWebJS.Chat[],
    chats: WAWebJS.Chat[],
  ) {
    if (syncChats.length < chats.length) {
      const failedCount = chats.length - syncChats.length;
      this.logger.error(`[${userId}] ${failedCount} chats failed to sync.`);

      const syncChatIds = new Set(
        syncChats.map((syncChat) => syncChat?.id?._serialized),
      );

      for (const chat of chats) {
        const chatId = chat?.id?._serialized;
        if (!syncChatIds.has(chatId)) {
          this.logger.warn(`[${userId}]`, "Chats failed to sync report:", {
            chat,
          });
        }
      }
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

  private async initializeClient(user: User): Promise<void> {
    const clientId: string = user.id;

    if (this.clients.has(clientId)) {
      this.logger.warn(
        `[${clientId}] Initialization aborted: Client already exists in memory.`,
      );
      return;
    }

    const sessionDataPath: string =
      process.env.WHATSAPP_SESSION_PATH || join(process.cwd(), ".wwebjs_auth");

    const userSessionDirectory: string = join(
      sessionDataPath,
      `session-${clientId}`,
    );

    try {
      this.logger.log(
        `[${clientId}] Searching for and removing all stale Chromium lock files...`,
      );

      const lockFiles: string[] = [
        join(userSessionDirectory, "SingletonLock"),
        join(userSessionDirectory, "Default", "SingletonLock"),
        join(userSessionDirectory, "SingletonCookie"),
        join(userSessionDirectory, "SingletonSocket"),
      ];

      for (const lockFilePath of lockFiles) {
        await fs.rm(lockFilePath, { force: true }).catch(() => null);
      }
    } catch (cleanupError) {
      this.logger.warn(`[${clientId}] Cleanup warning: ${cleanupError}`);
    }

    this.logger.log(`[${clientId}] Starting cold boot: Spawning puppeteer...`);

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: clientId,
        dataPath: sessionDataPath,
      }),
      puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-software-rasterizer",
        ],
      },
    });

    this.initializeListener(clientId, client, user);
    try {
      this.logger.log(`[${clientId}] Invoking whatsapp-web.js initialize()...`);
      await client.initialize();
      this.clients.set(clientId, client);
      this.logger.log(
        `[${clientId}] Client instance successfully registered in memory map.`,
      );
    } catch (initializationError) {
      this.logger.error(
        `[${clientId}] Critical failure during cold boot: ${initializationError}`,
      );
      this.clients.delete(clientId);
    }
  }

  private initializeListener(
    clientId: string,
    client: Client,
    user: User,
  ): void {
    this.logger.log(
      `[${clientId}] Attaching event listeners for lifecycle observability...`,
    );

    client.on("qr", (qr: string) => {
      this.logger.log(`[${clientId}] QR Code generated. Awaiting user scan...`);
      void this.updateConnectionStatus(clientId, {
        status: WhatsappClientStatusEnum.PENDING,
        qr,
      });
    });

    client.on("ready", () => {
      this.logger.log(
        `[${clientId}] Client is READY. Starting initial chat synchronization...`,
      );
      void this.updateConnectionStatus(clientId, {
        status: WhatsappClientStatusEnum.CONNECTED,
      });
      void this.syncAllChats(clientId, client);
      void this.syncSelfProfileImage(user, client);
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
      this.logger.log(
        `[${clientId}] Authentication successful. Session files are being utilized.`,
      );
      void this.updateConnectionStatus(clientId, {
        status: WhatsappClientStatusEnum.AUTHENTICATED,
      });
    });

    client.on("auth_failure", (message: string) => {
      this.logger.warn(`[${clientId}] Client disconnected. Reason: ${message}`);
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

    client.on("change_state", (state) => {
      this.logger.log(`[${clientId}] Connection state changed to: ${state}`);
    });
  }
}

export default WhatsappClientService;
