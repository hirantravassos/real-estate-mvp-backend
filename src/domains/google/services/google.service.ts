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
import { GoogleConnectionStatusDto } from "../dtos/google-connection-status.dto";
import { CryptoUtils } from "../../../shared/utils/crypto.util";

@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);
  private readonly googleClient: OAuth2Client;
  private readonly googleClientId: string;
  private readonly googleClientSecret: string;
  private readonly tokenEncryptionKey: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    this.googleClientId =
      this.configService.getOrThrow<string>("GOOGLE_CLIENT_ID");
    this.googleClientSecret = this.configService.getOrThrow<string>(
      "GOOGLE_CLIENT_SECRET",
    );
    this.tokenEncryptionKey = this.configService.getOrThrow<string>(
      "GOOGLE_TOKEN_ENCRYPTION_KEY",
    );
    this.googleClient = new OAuth2Client(
      this.googleClientId,
      this.googleClientSecret,
      "postmessage",
    );
  }

  /** Whether the user currently has Google Contacts access connected. */
  async getConnectionStatus(
    userId: string,
  ): Promise<GoogleConnectionStatusDto> {
    const user = await this.findUserOrThrow(userId);

    return { connected: Boolean(user.googleRefreshToken) };
  }

  /**
   * Verifies a one-time authorization code from the basic login/register
   * flow (email + profile scope only) and returns the caller's identity.
   */
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
   * One-time exchange of a "contacts" consent authorization code for a
   * refresh token, persisted (encrypted) against the user so future contact
   * reads never need another code or user prompt.
   */
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
      },
    );
  }

  /** Revokes the stored Google Contacts grant, both on Google's side and locally. */
  async disconnectContacts(userId: string): Promise<void> {
    const user = await this.findUserOrThrow(userId);

    if (!user.googleRefreshToken) return;

    const refreshToken = CryptoUtils.decrypt(
      user.googleRefreshToken,
      this.tokenEncryptionKey,
    );

    await this.googleClient.revokeToken(refreshToken).catch((error) => {
      this.logger.warn(`Failed to revoke Google token remotely: ${error}`);
    });

    await this.userRepository.update(
      { id: userId },
      { googleRefreshToken: null },
    );
  }

  async getContacts(userId: string): Promise<GoogleContactDto[]> {
    const user = await this.findUserOrThrow(userId);

    if (!user.googleRefreshToken) {
      throw this.googleNotConnectedError();
    }

    // A fresh client per call, scoped to this user's refresh token - the
    // shared `googleClient` above must never carry per-user credentials.
    const client = new OAuth2Client(
      this.googleClientId,
      this.googleClientSecret,
    );
    client.setCredentials({
      refresh_token: CryptoUtils.decrypt(
        user.googleRefreshToken,
        this.tokenEncryptionKey,
      ),
    });

    const response = await client
      .request<GooglePeopleConnectionsResponse>({
        url: "https://people.googleapis.com/v1/people/me/connections",
        params: {
          personFields: "names,emailAddresses,phoneNumbers,photos",
          pageSize: 1000,
        },
      })
      .catch((error) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (error?.response?.data?.error === "invalid_grant") {
          throw this.googleNotConnectedError();
        }

        throw error;
      });

    return GoogleContactMapper.toDtoList(response.data.connections ?? []);
  }

  private async findUserOrThrow(userId: string): Promise<User> {
    return this.userRepository.findOneByOrFail({ id: userId }).catch(() => {
      throw new NotFoundException("User not found");
    });
  }

  private googleNotConnectedError(): HttpException {
    return new HttpException(
      {
        code: "GOOGLE_NOT_CONNECTED",
        message:
          "User has not connected Google Contacts, or access was revoked",
      },
      HttpStatus.PRECONDITION_REQUIRED,
    );
  }
}
