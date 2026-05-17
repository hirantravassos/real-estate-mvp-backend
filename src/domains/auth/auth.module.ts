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
import Joi from "joi";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        JWT_SECRET: Joi.string(),
        JWT_EXPIRATION_TIME: Joi.number(),
        JWT_REFRESH_SECRET: Joi.string(),
        JWT_REFRESH_EXPIRATION_TIME: Joi.number().default(60),
        MFA_TOKEN_EXPIRATION_MINUTES: Joi.number(),
        MFA_TOKEN_LENGTH: Joi.number(),
        GOOGLE_CLIENT_ID: Joi.string(),
        GOOGLE_CLIENT_SECRET: Joi.string(),
        GOOGLE_CALLBACK_URL: Joi.string(),
      }),
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.getOrThrow<number>(
            "JWT_REFRESH_EXPIRATION_TIME",
          ),
        },
      }),
    }),
    PassportModule.register({ session: false }),
    TypeOrmModule.forFeature([User, Kanban]),
    forwardRef(() => UserModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, JwtStrategy],
  exports: [AuthService, JwtModule, UserModule],
})
export class AuthModule {}
