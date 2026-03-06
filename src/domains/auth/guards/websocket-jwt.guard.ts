import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Socket } from "socket.io";
import { UserRepository } from "../../users/repositories/user.repository";
import { User } from "../../users/entities/user.entity";

interface AuthenticatedSocket extends Socket {
  user?: User;
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<AuthenticatedSocket>();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const token =
      client.handshake?.headers?.authorization?.split(" ")[1] ||
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
      client.handshake?.auth?.token?.split(" ")[1];

    if (!token) {
      throw new UnauthorizedException("Missing authentication token");
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ id: string }>(token);
      const user = await this.userRepository.findOneBy({ id: payload.id });

      if (!user) {
        throw new UnauthorizedException("Invalid user");
      }

      client.user = user;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid credentials");
    }
  }
}
