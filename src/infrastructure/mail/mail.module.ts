import { Logger, Module } from "@nestjs/common";
import { MailerModule } from "@nestjs-modules/mailer";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MailService } from "./services/mail.service";

const DEVELOPMENT_HOST = "smtp.example.com";
const IMPLICIT_TLS_PORT = 465;
const SMTP_TIMEOUT_MILLISECONDS = 10_000;

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>("mail.host", DEVELOPMENT_HOST);
        const from = configService.get<string>(
          "mail.from",
          "noreply@example.com",
        );
        const isDevMode = host === DEVELOPMENT_HOST || !host;

        if (isDevMode) {
          if (process.env.NODE_ENV === "production") {
            new Logger("MailModule").warn(
              "MAIL_HOST is not set: mails are only logged, nobody receives them",
            );
          }
          return {
            transport: {
              jsonTransport: true,
            },
            defaults: { from },
          };
        }

        const port = configService.get<number>("mail.port", 587);
        return {
          transport: {
            host,
            port,
            // 465 speaks TLS from the start, the others must upgrade with
            // STARTTLS, so the password never travels in clear text.
            secure: port === IMPLICIT_TLS_PORT,
            requireTLS: port !== IMPLICIT_TLS_PORT,
            connectionTimeout: SMTP_TIMEOUT_MILLISECONDS,
            greetingTimeout: SMTP_TIMEOUT_MILLISECONDS,
            socketTimeout: SMTP_TIMEOUT_MILLISECONDS,
            auth: {
              user: configService.get<string>("mail.user"),
              pass: configService.get<string>("mail.password"),
            },
          },
          defaults: { from },
        };
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
