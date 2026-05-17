import { Module } from "@nestjs/common";
import { MailerModule } from "@nestjs-modules/mailer";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { join } from "path";
import Joi from "joi";
import { MailService } from "./services/mail.service";
import { EjsAdapter } from "@nestjs-modules/mailer/adapters/ejs.adapter";

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
        template: {
          dir: join(__dirname, "templates"),
          adapter: new EjsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
  ],
  providers: [MailService],
  exports: [MailerModule, MailService],
})
export class MailModule {}
