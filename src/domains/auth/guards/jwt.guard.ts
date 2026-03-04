import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { User } from "../../users/entities/user.entity";

@Injectable()
export class JwtGuard extends AuthGuard("jwt") {
  handleRequest<TUser = User>(error: any, user: TUser): TUser {
    if (error || !user) {
      throw new UnauthorizedException("Invalid or expired token");
    }
    return user;
  }
}
