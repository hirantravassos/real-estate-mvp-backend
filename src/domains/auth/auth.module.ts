import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule, JwtModuleOptions } from "@nestjs/jwt";
import { AuthController } from "./controllers/auth.controller";
import { AuthService } from "./services/auth.service";
import { User } from "../users/entities/user.entity";
import { GoogleStrategy } from "./strategies/google.strategy";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { Kanban } from "../kanbans/entities/kanban.entity";
import Joi from "joi";
import { GoogleModule } from "../google/google.module";
import { MailModule } from "../../infrastructure/mail/mail.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRATION_TIME: Joi.number().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_REFRESH_EXPIRATION_TIME: Joi.number().required(),
        MFA_TOKEN_EXPIRATION_MINUTES: Joi.number(),
        MFA_TOKEN_LENGTH: Joi.number(),
        GOOGLE_CALLBACK_URL: Joi.string(),
      }),
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: Number(
            configService.getOrThrow<string | number>("JWT_EXPIRATION_TIME"),
          ),
        },
      }),
    }),
    PassportModule.register({ session: false }),
    TypeOrmModule.forFeature([User, Kanban]),
    MailModule,
    GoogleModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
