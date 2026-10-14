import { Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { resolveCorsOrigins } from "../../shared/utils/cors-origins.util";
import { UserRepository } from "../../domains/users/repositories/user.repository";
import {
  SESSIONS_ENDED_EVENT,
  sessionEvents,
} from "../../shared/utils/session-events.util";

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
    origin: resolveCorsOrigins(),
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  private readonly server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
  ) {}

  private readonly endSessions = (userId: string) => {
    const room = userRoom(userId);
    this.server?.to(room).emit("session.expired");
    this.server?.in(room).disconnectSockets(true);
  };

  onModuleInit() {
    sessionEvents.on(SESSIONS_ENDED_EVENT, this.endSessions);
  }

  onModuleDestroy() {
    sessionEvents.off(SESSIONS_ENDED_EVENT, this.endSessions);
  }

  async handleConnection(socket: Socket) {
    const authentication = socket.handshake.auth as { token?: unknown };
    const token =
      typeof authentication?.token === "string" ? authentication.token : null;

    if (!token) {
      socket.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        id: string;
        typ?: string;
        ver?: number;
      }>(token);
      if (payload.typ && payload.typ !== "access") {
        throw new Error("Not an access token");
      }
      // Same checks as the HTTP guard: a deleted account or a logged out
      // session never joins the room.
      const user = await this.userRepository.findOneBy({
        id: payload.id,
        active: true,
      });
      if (!user || (payload.ver ?? 0) !== user.tokenVersion) {
        throw new Error("Session ended");
      }
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
