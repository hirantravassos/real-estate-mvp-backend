import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { databaseConfig } from "./shared/config/database.config.js";
import { authConfig } from "./shared/config/auth.config.js";
import { mailConfig } from "./shared/config/mail.config.js";
import { MailModule } from "./infrastructure/mail/mail.module.js";
import { UserModule } from "./domains/users/user.module";
import { appConfig } from "./shared/config/app.config";
import { AuthModule } from "./domains/auth/auth.module";
import { jwtConfig } from "./shared/config/jwt.config";
import { CustomerModule } from "./domains/customers/customer.module";
import { KanbanModule } from "./domains/kanbans/kanban.module";
import { WhatsappModule } from "./domains/whatsapp/whatsapp.module";
import { VisitModule } from "./domains/visits/visit.module";
import { PropertyModule } from "./domains/properties/property.module";
import { bucketConfig } from "./shared/config/bucket.config";
import { StorageModule } from "./domains/storage/storage.module";

const THROTTLE_TTL_MS = 60_000;
const THROTTLE_LIMIT = 30;

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
    StorageModule,
    MailModule,
    UserModule,
    AuthModule,
    CustomerModule,
    KanbanModule,
    WhatsappModule,
    VisitModule,
    PropertyModule,
  ],
  // providers: [
  //   {
  //     provide: APP_GUARD,
  //     useClass: ThrottlerGuard,
  //   },
  // ],
})
export class AppModule {}
