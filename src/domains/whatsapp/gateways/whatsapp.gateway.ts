import {
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { forwardRef, Inject, Logger, UseGuards } from "@nestjs/common";
import { WhatsappService } from "../services/whatsapp.service";
import { User } from "../../users/entities/user.entity";
import { BaseSecureGateway } from "../../auth/gateways/secure.gateway";
import { WsJwtGuard } from "../../auth/guards/websocket-jwt.guard";
import { WhatsappChatService } from "../services/whatsapp-chat.service";
import { GetUserSocket } from "../../../shared/decorators/get-user-socket.decorator";
import { WhatsappConnectionStatusEnum } from "../enums/whatsapp-connection-status.enum";

const GATEWAY_KEY = "whatsapp" as const;

export const GATEWAY_WHATSAPP_EVENTS = {
  LISTEN: {
    STATUS: `${GATEWAY_KEY}.status.listen`,
    CHAT: `${GATEWAY_KEY}.chat.listen`,
    CHATS: `${GATEWAY_KEY}.chats.listen`,
  },
  TRIGGER: {
    STATUS: `${GATEWAY_KEY}.status.trigger`,
    CHAT: `${GATEWAY_KEY}.chat.trigger`,
    CHATS: `${GATEWAY_KEY}.chats.trigger`,
  },
};

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class WhatsappGateway extends BaseSecureGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WhatsappGateway.name);

  constructor(
    wsJwtGuard: WsJwtGuard,
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsappService: WhatsappService,
    @Inject(forwardRef(() => WhatsappChatService))
    private readonly whatsappChatService: WhatsappChatService,
  ) {
    super(wsJwtGuard);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage(GATEWAY_WHATSAPP_EVENTS.TRIGGER.STATUS)
  async handleGetStatus(
    @GetUserSocket() user: User,
    @ConnectedSocket() client: Socket,
  ) {
    const status = await this.whatsappService.findStatus(user);
    console.log("status triggered", user.name, client.id, status);
    client.emit(GATEWAY_WHATSAPP_EVENTS.TRIGGER.STATUS, status);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage(GATEWAY_WHATSAPP_EVENTS.TRIGGER.CHAT)
  async handleGetChats(@GetUserSocket() user: User) {
    await this.emitChatsUpdate(user);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage(GATEWAY_WHATSAPP_EVENTS.TRIGGER.CHATS)
  async handleGetChat(
    @GetUserSocket() user: User,
    payload: { whatsappId: string },
  ) {
    const whatsappId = payload?.whatsappId;
    if (!whatsappId) return;
    void this.whatsappChatService.save(user, payload?.whatsappId, {
      unread: false,
    });
    await this.emitChatUpdate(user, payload.whatsappId);
    await this.emitChatsUpdate(user);
  }

  emitStatusUpdate(
    userId: string,
    payload: {
      status: WhatsappConnectionStatusEnum;
      name: string;
      qr: string | null;
    },
  ) {
    console.log("emitting status update", userId, payload);
    this.server
      .to(`user_${userId}`)
      .emit(GATEWAY_WHATSAPP_EVENTS.LISTEN.STATUS, payload);
  }

  async emitChatsUpdate(user: User) {
    const chats = await this.whatsappChatService.findAll(user);
    this.server
      .to(`user_${user.id}`)
      .emit(GATEWAY_WHATSAPP_EVENTS.LISTEN.CHATS, chats);
  }

  async emitChatUpdate(user: User, whatsappId: string) {
    const chat = await this.whatsappChatService.findOne(user, whatsappId);
    this.server
      .to(`user_${user.id}`)
      .emit(GATEWAY_WHATSAPP_EVENTS.LISTEN.CHAT, chat);
  }
}
