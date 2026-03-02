/* eslint-disable */

import { OAuth2Client, TokenPayload } from "google-auth-library";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { User } from "../../users/entities/user.entity";
import { ConfigService } from "@nestjs/config";
import { UserRepository } from "../../users/repositories/user.repository";
import { UserMapper } from "../../users/mappers/user.mapper";
import { JwtService } from "@nestjs/jwt";
import { TokenDto } from "../dtos/token.dto";

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;
  private readonly googleClientId: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {
    const clientId = this.configService.get<string>("auth.googleClientId");

    if (!clientId) {
      throw new Error("Google Client ID is not defined in the configuration");
    }

    this.googleClientId = clientId;
    this.googleClient = new OAuth2Client(clientId);
  }

  async authenticateWithGoogle(idToken: string): Promise<TokenDto | void> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: idToken,
        audience: this.googleClientId,
      });

      const payload: TokenPayload | undefined = ticket.getPayload();

      if (!payload) {
        throw new UnauthorizedException("Invalid Google payload");
      }

      const payloadUser = UserMapper.toEntityFromGoogle(payload);
      let user = await this.userRepository.findByEmail(payloadUser.email);

      if (!user) {
        user = await this.userRepository.save(payloadUser);
      }

      return this.generateInternalJwt(user);
    } catch (error) {
      console.error("Error authenticating with Google:", error);
      throw new UnauthorizedException("Authentication failed, google expired token");
    }
  }

  private generateInternalJwt(user: User): TokenDto {
    const payload = {
      id: user.id,
      email: user.email,
    };

    const refreshToken = this.jwtService.sign(payload, { expiresIn: "7d" });
    const idToken = this.jwtService.sign(payload, { expiresIn: "15m" });
    const accessToken = this.jwtService.sign(payload, { expiresIn: "1h" });

    return {
      idToken,
      accessToken,
      refreshToken,
    };
  }
}
