import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { WsJwtGuard } from "./domains/auth/guards/websocket-jwt.guard";
import { BaseSecureGateway } from "./domains/auth/gateways/secure.gateway";
import { GetUserSocket } from "./shared/decorators/get-user-socket.decorator";
import { User } from "./domains/users/entities/user.entity";

@WebSocketGateway({
  cors: {
    origin: process.env.APP_CORS_ORIGIN ?? "http://localhost:3000",
  },
})
export class AppGateway extends BaseSecureGateway {
  private readonly logger = new Logger(AppGateway.name);

  constructor(wsJwtGuard: WsJwtGuard) {
    super(wsJwtGuard);
  }

  @SubscribeMessage("client_message_private")
  handleMessagePrivate(
    @GetUserSocket() user: User,
    @MessageBody() data: string,
  ) {
    this.logger.log(`Received message from user ${user.id}: ${data}`);
    return { event: "private_response", data: "Verified access only" };
  }

  sendNotificationToAll(payload: object): void {
    this.webSocketServer.emit("server_notification", payload);
  }
}
