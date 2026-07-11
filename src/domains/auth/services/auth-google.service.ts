import { Logger, UnauthorizedException } from "@nestjs/common";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import { ConfigService } from "@nestjs/config";
import { User } from "../../users/entities/user.entity";
import { UserMapper } from "../../users/mappers/user.mapper";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { GoogleUserDto } from "../dtos/google-user.dto";

export class AuthGoogleService {
  private readonly logger = new Logger(AuthGoogleService.name);
  private readonly googleClient: OAuth2Client;
  private readonly googleClientId: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    const clientId = this.configService.getOrThrow<string>("GOOGLE_CLIENT_ID");
    const clientSecret = this.configService.getOrThrow<string>(
      "GOOGLE_CLIENT_SECRET",
    );

    this.googleClientId = clientId;
    this.googleClient = new OAuth2Client(clientId, clientSecret, "postmessage");
  }

  async getOrThrowGooglePayload(
    authenticationCode: string,
  ): Promise<GoogleUserDto> {
    const { tokens } = await this.googleClient.getToken(authenticationCode);

    if (!tokens.id_token) {
      throw new UnauthorizedException("Invalid Google ID token");
    }

    const ticket = await this.googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: this.googleClientId,
    });

    const payload: TokenPayload | undefined = ticket.getPayload();

    if (!payload) {
      throw new UnauthorizedException("Invalid Google payload");
    }

    return UserMapper.toGoogleDto(payload);
  }

  /**
   * This method will auto-validate email for the user
   * */
  async validateGoogleLink(googleId?: string): Promise<void> {
    if (!googleId) return;

    const googlePayload = await this.getOrThrowGooglePayload(googleId);
    const foundUser = await this.userRepository.findOneBy({
      email: googlePayload.email,
    });

    if (!foundUser) return;

    await this.userRepository.update(
      { id: foundUser.id },
      {
        googleId: googleId,
        isEmailValidated: true,
      },
    );
  }
}
