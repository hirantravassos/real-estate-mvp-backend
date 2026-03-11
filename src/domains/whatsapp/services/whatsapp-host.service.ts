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
import qrcode from "qrcode-terminal";
import { WhatsappHostMapper } from "../mappers/whatsapp-host.mapper";
import { WhatsappChat } from "../entities/whatsapp-chat.entity";
import { WhatsappChatMapper } from "../mappers/whatsapp-chat.mapper";

@Injectable()
export class WhatsappHostService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappHostService.name);
  private clients: Map<string, Client> = new Map();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(WhatsappChat)
    private readonly whatsappChatRepository: Repository<WhatsappChat>,
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

  async getStatus(user: User) {
    const client = await this.getClientOrThrow(user);
    const state = await client.getState();
    return WhatsappHostMapper.toDto(state);
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

    return client;
  }

  private async syncChats(userId: string, client: WAWebJS.Client) {
    const user = await this.userRepository.findOneBy({ id: userId });

    if (!user) {
      this.logger.error("syncChats.error", "user not found", { userId });
      return;
    }

    const chats = await client.getChats();

    for (const chat of chats) {
      void this.syncChat(chat, user);
    }
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

    const chat = await message.getChat();
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

  private initializeClient(clientId: string): void {
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
      qrcode.generate(qr, { small: true });
      void this.userRepository.update(
        { id: clientId },
        {
          qr,
        },
      );
      this.logger.log(`[${clientId}] Scan the QR code above.`);
    });

    client.on("ready", () => {
      this.logger.log(`[${clientId}] Client is fully connected and ready.`);
      void this.syncChats(clientId, client);
    });

    client.on("message", (message) => {
      void this.syncMessage(clientId, message);
    });

    client.on("authenticated", () => {
      this.logger.log(`[${clientId}] Session authenticated.`);
    });

    client.on("auth_failure", (message: string) => {
      this.logger.error(`[${clientId}] Authentication failure: ${message}`);
      this.clients.delete(clientId); // Clean up bad instance
    });

    client.on("disconnected", (reason: string) => {
      this.logger.warn(`[${clientId}] Client was logged out: ${reason}`);
      this.clients.delete(clientId);
    });

    void client.initialize().catch((error) => {
      this.logger.error(`[${clientId}] Initialization error:`, error);
    });
  }
}
