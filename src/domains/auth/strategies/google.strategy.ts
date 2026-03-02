import {
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Profile, Strategy } from "passport-google-oauth20";
import { ConfigService } from "@nestjs/config";
import { UserService } from "../../users/services/user.service";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {
    const googleClientId = configService.get<string>("auth.googleClientId");
    const googleClientSecret = configService.get<string>(
      "auth.googleClientSecret",
    );
    const googleCallbackUrl = configService.get<string>(
      "auth.googleCallbackUrl",
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

    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException("User not found in database");
    }

    return user;
  }
}
