import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import WAWebJS, { Client, LocalAuth, WAState } from "whatsapp-web.js";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "../../users/entities/user.entity";
import { WhatsappChat } from "../entities/whatsapp-chat.entity";
import { WhatsappChatMapper } from "../mappers/whatsapp-chat.mapper";
import { WhatsappStatus } from "../entities/whatsapp-status.entity";
import { WhatsappClientStatusEnum } from "../enums/whatsapp-client-status.enum";
import { error } from "qrcode-terminal";

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
    await this.restoreSessions();
  }

  requestConnection(user: User) {
    const clientId: string = user.id;

    if (this.clients.has(clientId)) {
      return {
        success: true,
        message: "Client already initializing or ready.",
      };
    }

    this.initializeClient(clientId);
  }

  async requestLogout(userId: string) {
    this.logger.log(`[${userId}] Client was logged out by user request`);
    void this.updateConnectionStatus(userId, {
      status: WhatsappClientStatusEnum.ERROR,
      qr: null,
    });
    const client = this.clients.get(userId);
    await client?.logout();
  }

  async getClientOrThrow(user: User): Promise<Client> {
    const client = this.clients.get(user.id);

    if (!client) {
      throw new NotFoundException(`Client not found for user: ${user.id}`);
    }

    const state = await client.getState();

    if (state !== WAState.CONNECTED) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(client);
        }, 5000);
      });
    }

    void this.updateConnectionStatus(user.id, {
      status: WhatsappClientStatusEnum.CONNECTED,
    });

    return client;
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
      });
    });
  }

  private async syncChat(chat: WAWebJS.Chat, user: User) {
    if (chat.isGroup) {
      this.logger.log(
        `[${user.id}]`,
        `Skipped chat (group): ${chat.id._serialized}`,
      );
      return;
    }

    const contact = await chat.getContact();
    const profile = await contact.getProfilePicUrl().catch(() => null);
    const entity = WhatsappChatMapper.toEntity(
      {
        ...chat,
        contact,
        profile,
      },
      user,
    );
    this.logger.log(`[${user.id}]`, `Syncing chat: ${entity.id}`);
    await this.whatsappChatRepository.upsert(entity, ["user", "id"]);
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

  private async restoreSessions(): Promise<void> {
    this.logger.log("Restoring previous WhatsApp sessions...");

    const users = await this.userRepository.find();

    for (const user of users) {
      this.logger.log(`Restoring session for: ${user.id}`);
      this.initializeClient(user.id);
    }
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

  private initializeClient(clientId: string): void {
    this.logger.log(`[${clientId}] Initializing client...`);

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: clientId,
        dataPath: "./sessions",
      }),
      puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    });

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
