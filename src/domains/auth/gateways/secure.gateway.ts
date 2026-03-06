import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { ExecutionContextHost } from "@nestjs/core/helpers/execution-context-host";
import { WsJwtGuard } from "../guards/websocket-jwt.guard";
import { User } from "../../users/entities/user.entity";

interface AuthenticatedSocket extends Socket {
  user?: User;
}

export abstract class BaseSecureGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  protected readonly webSocketServer: Server;

  protected constructor(protected readonly wsJwtGuard: WsJwtGuard) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const context = new ExecutionContextHost([client]);
      const canConnect = await this.wsJwtGuard.canActivate(context as any);

      if (!canConnect) {
        client.disconnect();
        return;
      }

      if (client?.user?.id) {
        const userRoomName = `user_${client?.user.id}`;
        await client.join(userRoomName);
        // console.log(`User ${client?.user.id} joined room: ${userRoomName}`);
      }

      // console.log(`Client authenticated and connected: ${client.id}`);
    } catch (error) {
      console.error(`Unauthorized connection attempt: ${client.id}`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    console.log(`Client disconnected: ${client.id}`);
  }
}
