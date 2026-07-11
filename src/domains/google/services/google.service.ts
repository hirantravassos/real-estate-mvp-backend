import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../../users/entities/user.entity";
import { UserMapper } from "../../users/mappers/user.mapper";
import { GoogleUserDto } from "../dtos/google-user.dto";
import { GoogleContactDto } from "../dtos/google-contact.dto";
import { GoogleContactMapper } from "../mappers/google-contact.mapper";
import { GooglePeopleConnectionsResponse } from "../interfaces/google-people-response.interface";
import { CryptoUtils } from "../../../shared/utils/crypto.util";

@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);
  private readonly googleClient: OAuth2Client;
  private readonly googleClientId: string;
  private readonly tokenEncryptionKey: string;

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
    this.tokenEncryptionKey = this.configService.getOrThrow<string>(
      "GOOGLE_TOKEN_ENCRYPTION_KEY",
    );
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

  async connectContacts(
    userId: string,
    authenticationCode: string,
  ): Promise<void> {
    const { tokens } = await this.googleClient.getToken(authenticationCode);

    if (!tokens.refresh_token) {
      throw new UnauthorizedException(
        "Google did not return a refresh token. Revoke access at " +
          "https://myaccount.google.com/permissions and try connecting again.",
      );
    }

    await this.userRepository.update(
      { id: userId },
      {
        googleRefreshToken: CryptoUtils.encrypt(
          tokens.refresh_token,
          this.tokenEncryptionKey,
        ),
        googleAccessToken: tokens.access_token
          ? CryptoUtils.encrypt(tokens.access_token, this.tokenEncryptionKey)
          : null,
        googleAccessTokenExpiresAt: tokens.expiry_date ?? null,
      },
    );
  }

  async getContacts(userId: string): Promise<GoogleContactDto[]> {
    const user = await this.userRepository
      .findOneByOrFail({ id: userId })
      .catch(() => {
        throw new NotFoundException("User not found");
      });

    if (!user.googleRefreshToken) {
      throw new HttpException(
        {
          code: "GOOGLE_NOT_CONNECTED",
          message: "User has not connected their Google contacts yet",
        },
        HttpStatus.PRECONDITION_REQUIRED,
      );
    }

    this.googleClient.setCredentials({
      refresh_token: CryptoUtils.decrypt(
        user.googleRefreshToken,
        this.tokenEncryptionKey,
      ),
    });

    this.googleClient.on("tokens", (tokens) => {
      void this.userRepository.update(
        { id: userId },
        {
          ...(tokens.access_token
            ? {
                googleAccessToken: CryptoUtils.encrypt(
                  tokens.access_token,
                  this.tokenEncryptionKey,
                ),
              }
            : {}),
          ...(tokens.expiry_date
            ? { googleAccessTokenExpiresAt: tokens.expiry_date }
            : {}),
        },
      );
    });

    const response =
      await this.googleClient.request<GooglePeopleConnectionsResponse>({
        url: "https://people.googleapis.com/v1/people/me/connections",
        params: {
          personFields: "names,emailAddresses,phoneNumbers,photos",
          pageSize: 1000,
        },
      });

    return GoogleContactMapper.toDtoList(response.data.connections ?? []);
  }

  /**
   * This method will auto-validate email for the user
   * */
  async validateGoogleLink(authenticationCode?: string): Promise<void> {
    if (!authenticationCode) return;

    const googlePayload =
      await this.getOrThrowGooglePayload(authenticationCode);
    const foundUser = await this.userRepository.findOneBy({
      email: googlePayload.email,
    });

    if (!foundUser) return;

    await this.userRepository.update(
      { id: foundUser.id },
      {
        googleId: googlePayload.id,
        picture: googlePayload.picture,
        isEmailValidated: true,
      },
    );
  }
}
