import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Profile, Strategy } from "passport-google-oauth20";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "../../users/entities/user.entity";
import { Repository } from "typeorm";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    const googleClientId = configService.getOrThrow<string>("GOOGLE_CLIENT_ID");
    const googleClientSecret = configService.getOrThrow<string>(
      "GOOGLE_CLIENT_SECRET",
    );
    const googleCallbackUrl = configService.getOrThrow<string>(
      "GOOGLE_CALLBACK_URL",
    );

    if (!googleClientId || !googleClientSecret) {
      throw new Error(
        "Critical Error: GOOGLE_CLIENT_ID or SECRET is missing in .env",
      );
    }

    super({
      clientID: googleClientId,
      clientSecret: googleClientSecret,
      callbackURL: googleCallbackUrl,
      scope: ["email", "profile"],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    const email = profile.emails?.[0]?.value;

    if (!email) {
      throw new UnauthorizedException("User not found in database");
    }

    const user = await this.userRepository.findOneBy({ email });

    if (!user) {
      throw new UnauthorizedException("User not found in database");
    }

    return user;
  }
}
