import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server } from "socket.io";
import { ExecutionContextHost } from "@nestjs/core/helpers/execution-context-host";
import { WsJwtGuard } from "../guards/websocket-jwt.guard";
import { AuthenticatedSocket } from "../../../shared/types/authenticated-socket.type";
import { ExecutionContext, Logger } from "@nestjs/common";

export abstract class BaseSecureGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  protected readonly webSocketServer: Server;

  private readonly baseLogger = new Logger(BaseSecureGateway.name);

  protected constructor(protected readonly wsJwtGuard: WsJwtGuard) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const context: ExecutionContext = new ExecutionContextHost([client]);
      const canConnect = await this.wsJwtGuard.canActivate(context);

      if (!canConnect) {
        // client.emit("connect_error", { message: "Authentication failed" });
        client.disconnect();
        return;
      }

      if (client?.user?.id) {
        const userRoomName = `user_${client.user.id}`;
        await client.join(userRoomName);
      }
    } catch (error) {
      this.baseLogger.error(
        `Unauthorized connection attempt: ${client.id}`,
        error instanceof Error ? error.stack : undefined,
      );
      // client.emit("connect_error", { message: "Authentication failed" });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    this.baseLogger.log(`Client disconnected: ${client.id}`);
  }
}
