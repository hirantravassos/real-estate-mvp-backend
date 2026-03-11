import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserRepository } from "../../users/repositories/user.repository";
import { AuthenticatedSocket } from "../../../shared/types/authenticated-socket.type";

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<AuthenticatedSocket>();
    const token = this.extractToken(client);

    if (!token) {
      console.error("Missing authentication token");
      return false;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ id: string }>(token);
      const user = await this.userRepository.findOneBy({ id: payload.id });

      if (!user) {
        console.error("Invalid user");
        return false;
      }

      client.user = user;
      return true;
    } catch (error) {
      console.error("Invalid credentials", error);
      return false;
    }
  }

  private extractToken(client: AuthenticatedSocket): string | undefined {
    const headerToken = client.handshake?.headers?.authorization;
    const authToken = client.handshake?.auth?.token as string | undefined;

    const rawToken = headerToken ?? authToken;

    if (!rawToken) {
      return undefined;
    }

    return rawToken.startsWith("Bearer ") ? rawToken.slice(7) : rawToken;
  }
}
