import { forwardRef, Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule, JwtModuleOptions } from "@nestjs/jwt";
import { AuthController } from "./controllers/auth.controller";
import { AuthService } from "./services/auth.service";
import { UserModule } from "../users/user.module";
import { User } from "../users/entities/user.entity";
import { GoogleStrategy } from "./strategies/google.strategy";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { Kanban } from "../kanbans/entities/kanban.entity";
import { WhatsappStatus } from "../whatsapp/entities/whatsapp-status.entity";

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const secret = configService.get<string>("jwt.secret");
        const expiresIn = configService.get<string>("jwt.expiration");

        if (!secret) {
          throw new Error("JWT_SECRET is not defined in the environment");
        }

        return {
          secret,
          signOptions: {
            expiresIn: (expiresIn ?? "60m") as "60m",
          },
        };
      },
    }),
    PassportModule.register({ session: false }),
    TypeOrmModule.forFeature([User, Kanban, WhatsappStatus]),
    forwardRef(() => UserModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, JwtStrategy],
  exports: [AuthService, JwtModule, UserModule],
})
export class AuthModule {}
