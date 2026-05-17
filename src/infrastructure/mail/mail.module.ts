import { Module } from "@nestjs/common";
import { MailerModule } from "@nestjs-modules/mailer";
import { ConfigModule, ConfigService } from "@nestjs/config";
import Joi from "joi";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        MAIL_HOST: Joi.string(),
        MAIL_PORT: Joi.number(),
        MAIL_USER: Joi.string(),
        MAIL_PASSWORD: Joi.string(),
        MAIL_FROM: Joi.string().email(),
      }),
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.getOrThrow<string>("MAIL_HOST"),
          port: configService.getOrThrow<number>("MAIL_PORT"),
          secure: true,
          auth: {
            user: configService.getOrThrow<string>("MAIL_USER"),
            pass: configService.getOrThrow<string>("MAIL_PASSWORD"),
          },
        },
        defaults: {
          from: configService.getOrThrow<string>("MAIL_FROM"),
        },
      }),
    }),
  ],
  exports: [MailerModule],
})
export class MailModule {}
