import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
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
import { BucketModule } from "./infrastructure/bucket/bucket.module";
import { mongoConfig } from "./config/mongo.config";
import { redisConfig } from "./config/redis.config";
import { whatsappConfig } from "./config/whatsapp.config";
import { WhatsappModule } from "./domains/whatsapp/whatsapp.module";

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
        redisConfig,
        whatsappConfig,
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
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>("redis.host", "localhost"),
          port: configService.get<number>("redis.port", 6379),
          password: configService.get<string | undefined>("redis.password"),
        },
      }),
    }),
    BucketModule,
    MailModule,
    UserModule,
    AuthModule,
    CustomerModule,
    KanbanModule,
    VisitModule,
    PropertyModule,
    WhatsappModule,
  ],
  // providers: [
  //   {
  //     provide: APP_GUARD,
  //     useClass: ThrottlerGuard,
  //   },
  // ],
})
export class AppModule {}
