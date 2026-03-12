import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { databaseConfig } from "./config/database.config.js";
import { authConfig } from "./config/auth.config.js";
import { mailConfig } from "./config/mail.config.js";
import { MailModule } from "./infrastructure/mail/mail.module.js";
import { UserModule } from "./domains/users/user.module";
import { appConfig } from "./config/app.config";
import { AuthModule } from "./domains/auth/auth.module";
import { jwtConfig } from "./config/jwt.config";
import { CustomerModule } from "./domains/customers/customer.module";
import { KanbanModule } from "./domains/kanbans/kanban.module";
import { WhatsappModule } from "./domains/whatsapp/whatsapp.module";
import { VisitModule } from "./domains/visits/visit.module";

const THROTTLE_TTL_MS = 60_000;
const THROTTLE_LIMIT = 30;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, authConfig, mailConfig, jwtConfig],
      envFilePath: ".env",
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "mysql",
        host: configService.getOrThrow<string>("database.host"),
        port: configService.getOrThrow<number>("database.port"),
        username: configService.getOrThrow<string>("database.username"),
        password: configService.getOrThrow<string>("database.password"),
        database: configService.getOrThrow<string>("database.database"),
        autoLoadEntities: true,
        synchronize: true,
        logging: false,
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: THROTTLE_TTL_MS,
        limit: THROTTLE_LIMIT,
      },
    ]),
    MailModule,
    UserModule,
    AuthModule,
    CustomerModule,
    KanbanModule,
    WhatsappModule,
    VisitModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
