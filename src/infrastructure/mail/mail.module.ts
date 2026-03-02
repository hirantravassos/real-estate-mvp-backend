import { Module } from "@nestjs/common";
import { MailerModule } from "@nestjs-modules/mailer";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>("mail.host", "smtp.example.com");
        const isDevMode = host === "smtp.example.com" || !host;

        if (isDevMode) {
          return {
            transport: {
              jsonTransport: true,
            },
            defaults: {
              from: configService.get<string>(
                "mail.from",
                "noreply@example.com",
              ),
            },
          };
        }

        return {
          transport: {
            host,
            port: configService.get<number>("mail.port", 587),
            secure: false,
            auth: {
              user: configService.get<string>("mail.user"),
              pass: configService.get<string>("mail.password"),
            },
          },
          defaults: {
            from: configService.get<string>("mail.from", "noreply@example.com"),
          },
        };
      },
    }),
  ],
  exports: [MailerModule],
})
export class MailModule {}
