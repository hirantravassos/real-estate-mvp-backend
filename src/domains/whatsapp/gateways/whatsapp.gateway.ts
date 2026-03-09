import {
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server } from "socket.io";
import { forwardRef, Inject, Logger } from "@nestjs/common";
import { WhatsappService } from "../services/whatsapp.service";
import { User } from "../../users/entities/user.entity";
import { BaseSecureGateway } from "../../auth/gateways/secure.gateway";
import { WsJwtGuard } from "../../auth/guards/websocket-jwt.guard";
import { WhatsappChatService } from "../services/whatsapp-chat.service";
import { NotificationService } from "../services/notification.service";
import { GetUserSocket } from "../../../shared/decorators/get-user-socket.decorator";
import { WhatsappConnectionStatusEnum } from "../enums/whatsapp-connection-status.enum";
import { Socket } from "socket.io";

const GATEWAY_KEY = "whatsapp" as const;

export const GATEWAY_WHATSAPP_EVENTS = {
  LISTEN: {
    STATUS: `${GATEWAY_KEY}.status.listen`,
    CHAT: `${GATEWAY_KEY}.chat.listen`,
    CHATS: `${GATEWAY_KEY}.chats.listen`,
    NOTIFICATION_COUNT: `${GATEWAY_KEY}.notification-count.listen`,
  },
  TRIGGER: {
    STATUS: `${GATEWAY_KEY}.status.trigger`,
    CHAT: `${GATEWAY_KEY}.chat.trigger`,
    CHATS: `${GATEWAY_KEY}.chats.trigger`,
    NOTIFICATION_COUNT: `${GATEWAY_KEY}.notification-count.trigger`,
  },
};

@WebSocketGateway({
  cors: {
    origin: process.env.APP_CORS_ORIGIN ?? "http://localhost:3000",
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
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
  ) {
    super(wsJwtGuard);
  }

  @SubscribeMessage(GATEWAY_WHATSAPP_EVENTS.TRIGGER.STATUS)
  async handleGetStatus(
    @GetUserSocket() user: User,
    @ConnectedSocket() client: Socket,
  ) {
    const status = await this.whatsappService.findStatus(user);
    this.logger.log(`Status triggered for ${user.name} (${client.id})`);
    client.emit(GATEWAY_WHATSAPP_EVENTS.LISTEN.STATUS, status);
  }

  @SubscribeMessage(GATEWAY_WHATSAPP_EVENTS.TRIGGER.CHATS)
  async handleGetChats(@GetUserSocket() user: User) {
    await this.emitChatsUpdate(user);
  }

  @SubscribeMessage(GATEWAY_WHATSAPP_EVENTS.TRIGGER.CHAT)
  async handleGetChat(
    @GetUserSocket() user: User,
    payload: { whatsappId: string },
  ) {
    const whatsappId = payload?.whatsappId;
    if (!whatsappId) return;

    await this.emitChatUpdate(user, whatsappId);
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
    this.logger.log(`Emitting status update to user ${userId}`);
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

  @SubscribeMessage(GATEWAY_WHATSAPP_EVENTS.TRIGGER.NOTIFICATION_COUNT)
  async handleGetNotificationCount(
    @GetUserSocket() user: User,
    @ConnectedSocket() client: Socket,
  ) {
    const result = await this.notificationService.countUnreadNotifications(user);
    this.logger.log(`Notification count triggered for ${user.name} (${client.id})`);
    client.emit(GATEWAY_WHATSAPP_EVENTS.LISTEN.NOTIFICATION_COUNT, result);
  }

  async emitNotificationCountUpdate(user: User) {
    const result = await this.notificationService.countUnreadNotifications(user);
    this.server
      .to(`user_${user.id}`)
      .emit(GATEWAY_WHATSAPP_EVENTS.LISTEN.NOTIFICATION_COUNT, result);
  }
}
