import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from "@nestjs/websockets";
import { UseGuards } from "@nestjs/common";
import { WsJwtGuard } from "./domains/auth/guards/websocket-jwt.guard";
import { BaseSecureGateway } from "./domains/auth/gateways/secure.gateway";
import { GetUserSocket } from "./shared/decorators/get-user-socket.decorator";
import { User } from "./domains/users/entities/user.entity";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class AppGateway extends BaseSecureGateway {
  constructor(wsJwtGuard: WsJwtGuard) {
    super(wsJwtGuard);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("client_message_private")
  handleMessagePrivate(
    @GetUserSocket() user: User,
    @MessageBody() data: string,
  ) {
    console.log(`Received message from user ${user.id}: ${data}`);
    return { event: "private_response", data: "Verified access only" };
  }

  sendNotificationToAll(payload: object): void {
    this.webSocketServer.emit("server_notification", payload);
  }
}
