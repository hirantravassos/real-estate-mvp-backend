import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
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
import { VisitModule } from "./domains/visits/visit.module";
import { PropertyModule } from "./domains/properties/property.module";
import { bucketConfig } from "./config/bucket.config";
import { mongoConfig } from "./config/mongo.config";
import { evolutionConfig } from "./config/evolution.config";
import { openaiConfig } from "./config/openai.config";
import { creditsConfig } from "./config/credits.config";
import { CreditModule } from "./domains/credits/credit.module";
import { InboxModule } from "./domains/inbox/inbox.module";

// const THROTTLE_TTL_MS = 60_000;
// const THROTTLE_LIMIT = 30;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        authConfig,
        mailConfig,
        jwtConfig,
        bucketConfig,
        mongoConfig,
        evolutionConfig,
        openaiConfig,
        creditsConfig,
      ],
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
    // ThrottlerModule.forRoot([
    //   {
    //     ttl: THROTTLE_TTL_MS,
    //     limit: THROTTLE_LIMIT,
    //   },
    // ]),
    MailModule,
    UserModule,
    AuthModule,
    CustomerModule,
    KanbanModule,
    VisitModule,
    PropertyModule,
    CreditModule,
    InboxModule,
  ],
  // providers: [
  //   {
  //     provide: APP_GUARD,
  //     useClass: ThrottlerGuard,
  //   },
  // ],
})
export class AppModule {}
