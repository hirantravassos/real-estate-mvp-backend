import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { UserRepository } from "../../users/repositories/user.repository";
import { User } from "../../users/entities/user.entity";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) {
    const jwtSecret = configService.get<string>("jwt.secret");

    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not defined in the configuration");
    }

    // Only the Authorization header: a token in the URL ends up in logs,
    // browser history and Referer headers.
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: {
    id: string;
    email: string;
    typ?: string;
    ver?: number;
  }): Promise<User> {
    if (payload.typ && payload.typ !== "access") {
      throw new UnauthorizedException("Not an access token");
    }

    // A deleted account is anonymized and inactive, its tokens die with it.
    const user = await this.userRepository.findOneBy({
      id: payload.id,
      active: true,
    });

    if (!user) {
      throw new UnauthorizedException("User not found or token invalid");
    }

    // A logout raised the version: every token issued before it is dead.
    if ((payload.ver ?? 0) !== user.tokenVersion) {
      throw new UnauthorizedException("Session ended");
    }

    return user;
  }
}
