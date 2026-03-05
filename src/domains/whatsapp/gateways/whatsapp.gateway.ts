import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { forwardRef, Inject, Logger } from "@nestjs/common";
import { WhatsappService } from "../services/whatsapp.service";
import { User } from "../../users/entities/user.entity";
import { WhatsappConnectionStatusEnum } from "../enums/whatsapp-connection-status.enum";
import { WhatsappChatRepository } from "../repositories/whatsapp-chat.repository";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class WhatsappGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WhatsappGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsappService: WhatsappService,
    private readonly whatsappChatRepository: WhatsappChatRepository,
  ) {}

  afterInit() {
    this.logger.log("WhatsappGateway initialized");
  }

  async handleConnection(client: Socket) {
    try {
      const userId = await this.getUserId(client);
      await client.join(`user_${userId}`);
      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
    } catch (err) {
      this.logger.error(
        `Connection rejected: ${client.id}`,
        (err as Error).message,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitStatusUpdate(userId: string, payload: any) {
    this.server.to(`user_${userId}`).emit("whatsapp_status", payload);
  }

  @SubscribeMessage("get_status")
  async handleGetStatus(client: Socket) {
    try {
      const userId = await this.getUserId(client);
      const user = { id: userId } as User;
      let status;
      try {
        status = await this.whatsappService.findStatus(user);
      } catch (err) {
        console.error("[WhatsappGateway] Error getting status:", err);
        status = {
          status: WhatsappConnectionStatusEnum.CLOSED,
          name: null,
          qr: null,
        };
      }

      client.emit("whatsapp_status", status);
    } catch (error) {
      this.logger.error("Failed to get status via socket", error);
    }
  }

  async emitChatsUpdate(userId: string) {
    const user = { id: userId } as User;
    const chats = await this.whatsappService.findAllChats(user);
    this.server.to(`user_${userId}`).emit("whatsapp_chats", chats);
  }

  async emitChatUpdate(userId: string, whatsappId: string) {
    const user = { id: userId } as User;
    const chat = await this.whatsappService.findAllMessages(user, whatsappId);
    this.server.to(`user_${userId}`).emit("whatsapp_chat", chat);
  }

  @SubscribeMessage("get_chats")
  async handleGetChats(client: Socket) {
    try {
      const userId = await this.getUserId(client);
      if (!userId) return;
      await this.emitChatsUpdate(userId);
    } catch (error) {
      this.logger.error("Failed to get chats via socket", error);
    }
  }

  @SubscribeMessage("get_chat")
  async handleGetChat(client: Socket, payload: { whatsappId: string }) {
    try {
      const userId = await this.getUserId(client);
      if (!userId) return;
      if (!payload?.whatsappId) return;
      void this.whatsappChatRepository.update(
        { whatsappId: payload.whatsappId, userId },
        {
          unread: false,
        },
      );
      await this.emitChatUpdate(userId, payload.whatsappId);
      await this.emitChatsUpdate(userId);
    } catch (error) {
      this.logger.error("Failed to get chat via socket", error);
    }
  }

  private async getUserId(client: Socket): Promise<string | null> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const token =
      client.handshake.auth.token ||
      client.handshake.headers.authorization?.split(" ")[1];

    if (!token) {
      throw new Error("No token provided");
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-argument
    const decoded = await this.jwtService.verifyAsync(token);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-member-access
    return decoded?.id;
  }
}
