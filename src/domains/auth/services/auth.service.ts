import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { User } from "../../users/entities/user.entity";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { TokenDto } from "../dtos/token.dto";
import { AccessTokenDto } from "../dtos/access-token.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PasswordLoginDto } from "../dtos/password-login.dto";
import { CryptoUtils } from "../../../shared/utils/crypto.util";
import { CreateAuthDto } from "../dtos/create-auth.dto";
import { GoogleService } from "../../google/services/google.service";
import { MailService } from "../../../infrastructure/mail/services/mail.service";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshSecret: string;
  private readonly accessExpirationTime: number;
  private readonly refreshExpirationTime: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly googleService: GoogleService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    const refreshSecret = this.configService.get<string>("JWT_REFRESH_SECRET");
    const accessExpiration = this.configService.get<number>(
      "JWT_REFRESH_EXPIRATION_TIME",
    );
    const refreshExpiration = this.configService.get<number>(
      "MFA_TOKEN_EXPIRATION_MINUTES",
    );

    if (!refreshSecret) {
      throw new Error("JWT_REFRESH_SECRET is not defined in the configuration");
    }

    this.refreshSecret = refreshSecret;
    this.accessExpirationTime = accessExpiration ?? 3600;
    this.refreshExpirationTime = refreshExpiration ?? 604800;
  }

  async register(dto: CreateAuthDto) {
    let hashPassword = null;
    const googleId = dto?.googleId;
    const facebookId = dto?.facebookId;
    const picture = dto?.picture ?? null;

    const hasPasswordProvided = Boolean(dto.password);
    const hasAnyOtherAuthenticationProvided =
      Boolean(googleId) || Boolean(facebookId);

    if (hasPasswordProvided && dto.password) {
      hashPassword = await CryptoUtils.hashPassword(dto.password);
    }

    if (!hasPasswordProvided && !hasAnyOtherAuthenticationProvided) {
      throw new BadRequestException(
        "Missing authentication methods, found any",
      );
    }

    const userAlreadyExists = await this.userRepository.exists({
      where: [
        {
          email: dto.email,
        },
        {
          phone: dto.phone,
        },
      ],
    });

    if (userAlreadyExists) {
      throw new ConflictException(
        "User already exists with email or phone number",
      );
    }

    const newUser = await this.userRepository
      .save({
        email: dto.email,
        phone: dto.phone,
        name: dto.name,
        password: hashPassword,
        googleId,
        facebookId,
        picture,
        isPhoneValidated: false,
        isEmailValidated: false,
      })
      .catch((err) => {
        this.logger.error("register.save", err);
        throw new InternalServerErrorException("[register.save]");
      });

    void this.mailService.sendEmail({
      sendTo: newUser.email,
      template: "welcome",
      context: {
        name: newUser.name,
      },
    });
  }

  async authenticateWithPassword(dto: PasswordLoginDto): Promise<TokenDto> {
    const email = dto.email;
    const phone = dto.phone;
    const password = dto.password;

    let user: User | null = null;

    if (email) {
      user = await this.userRepository
        .findOneOrFail({
          where: { email },
        })
        .catch(() => {
          throw new NotFoundException("Email not found");
        });
    }

    if (phone) {
      user = await this.userRepository
        .findOneOrFail({
          where: { phone },
        })
        .catch(() => {
          throw new NotFoundException("Phone not found");
        });
    }

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (!user?.password) {
      throw new UnauthorizedException("Passwords not allowed for this user");
    }

    const isValid = await CryptoUtils.validateHash(password, user.password);

    if (!isValid) {
      throw new UnauthorizedException("Passwords do not match");
    }

    return this.generateTokens(user);
  }

  async authenticateWithGoogle(authenticationCode: string): Promise<TokenDto> {
    const googleUser = await this.googleService
      .getOrThrowGooglePayload(authenticationCode)
      .catch(() => {
        throw new UnauthorizedException(
          "Authentication failed, google expired token",
        );
      });

    const user = await this.userRepository
      .findOneByOrFail({
        email: googleUser.email,
        googleId: googleUser.id,
      })
      .catch(() => {
        throw new NotFoundException(
          "User not found with email and google payload",
        );
      });

    return this.generateTokens(user);
  }

  async refreshAccessToken(refreshToken: string): Promise<AccessTokenDto> {
    let payload = null;

    try {
      payload = this.jwtService.verify<{ id: string; email: string }>(
        refreshToken,
        {
          secret: this.refreshSecret,
        },
      );
    } catch (error) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    if (!payload) {
      throw new UnauthorizedException("Token unavailable or not verified");
    }

    const user = await this.userRepository.findOneBy({ id: payload.id });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    try {
      const accessToken = this.jwtService.sign(
        { id: user.id, email: user.email },
        { expiresIn: this.accessExpirationTime },
      );

      return { accessToken };
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }

  private generateTokens(user: User): TokenDto {
    const payload = {
      id: user.id,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.accessExpirationTime,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshExpirationTime,
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
