import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { UserRepository } from "../../users/repositories/user.repository";
import { User } from "../../users/entities/user.entity";
import { EmailWhitelistService } from "../services/email-whitelist.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
    private readonly emailWhitelistService: EmailWhitelistService,
  ) {
    const jwtSecret = configService.get<string>("jwt.secret");

    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not defined in the configuration");
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter("token"),
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: { id: string; email: string }): Promise<User> {
    const user = await this.userRepository.findOneBy({ id: payload.id });

    if (!user) {
      throw new UnauthorizedException("User not found or token invalid");
    }

    if (!this.emailWhitelistService.isAllowed(user.email)) {
      throw new UnauthorizedException(
        "User is not allowed to access the system",
      );
    }

    return user;
  }
}
