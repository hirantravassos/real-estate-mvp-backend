import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

export type RealtimeEvent =
  | "connection.updated"
  | "conversation.updated"
  | "message.created"
  | "message.updated"
  | "message.removed"
  | "credits.updated"
  | "deal.updated"
  | "customers.updated"
  | "hunt.updated"
  | "matches.updated"
  | "briefing.updated";

const userRoom = (userId: string) => `user:${userId}`;

/**
 * One socket per open app. Each broker joins their own room and receives
 * only their own inbox, credit and sale updates.
 */
@WebSocketGateway({
  namespace: "/realtime",
  cors: {
    origin: process.env.APP_CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  private readonly server: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(socket: Socket) {
    const authentication = socket.handshake.auth as { token?: unknown };
    const token =
      typeof authentication?.token === "string" ? authentication.token : null;

    if (!token) {
      socket.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ id: string }>(token);
      await socket.join(userRoom(payload.id));
    } catch {
      this.logger.warn("Socket refused, invalid token");
      socket.emit("session.expired");
      socket.disconnect(true);
    }
  }

  emitToUser(userId: string, event: RealtimeEvent, payload: unknown) {
    this.server?.to(userRoom(userId)).emit(event, payload);
  }
}
