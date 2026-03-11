import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { Client, LocalAuth } from "whatsapp-web.js";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "../../users/entities/user.entity";
import qrcode from "qrcode-terminal";
import { WhatsappHostMapper } from "../mappers/whatsapp-host.mapper";

@Injectable()
export class WhatsappHostService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappHostService.name);
  private clients: Map<string, Client> = new Map();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

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
    const client = this.getClientOrThrow(user);
    const state = await client.getState();
    return WhatsappHostMapper.toDto(state);
  }

  getClientOrThrow(user: User): Client {
    const client = this.clients.get(user.id);
    if (!client) {
      throw new NotFoundException(`Client not found for user: ${user.id}`);
    }
    return client;
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
      this.logger.log(`[${clientId}] Scan the QR code above.`);
    });

    client.on("ready", () => {
      this.logger.log(`[${clientId}] Client is fully connected and ready.`);
    });

    client.on("message", (data) => {
      this.logger.log(`[${clientId}] Message received.`, { data });
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
