import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { ApiThrottlerGuard } from "./shared/guards/api-throttler.guard";
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
import { DealModule } from "./domains/deals/deal.module";
import { ContactImportModule } from "./domains/contact-imports/contact-import.module";
import { CustomerReclassificationModule } from "./domains/customer-reclassifications/customer-reclassification.module";
import { PropertyHuntModule } from "./domains/property-hunts/property-hunt.module";
import { portalsConfig } from "./config/portals.config";
import { AssistantModule } from "./domains/assistant/assistant.module";
import { OwnerFinderModule } from "./domains/owner-finder/owner-finder.module";
import { infosimplesConfig } from "./config/infosimples.config";
import { DocumentLookupModule } from "./domains/document-lookups/document-lookup.module";
import { BrokerPageModule } from "./domains/broker-pages/broker-page.module";
import { subscriptionsConfig } from "./config/subscriptions.config";
import { SubscriptionModule } from "./domains/subscriptions/subscription.module";
import { dailyBriefingConfig } from "./config/daily-briefing.config";
import { dataRetentionConfig } from "./config/data-retention.config";
import { DailyBriefingModule } from "./domains/daily-briefings/daily-briefing.module";
import { AccountDeletionModule } from "./domains/account-deletions/account-deletion.module";
import { DataRetentionModule } from "./domains/data-retention/data-retention.module";
import { buildDatabaseOptions } from "./database/database-options";

/** Loose default, only the routes with UserThrottlerGuard are counted. */
const THROTTLE_TTL_MS = 60_000;
const THROTTLE_LIMIT = 240;

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
        portalsConfig,
        infosimplesConfig,
        subscriptionsConfig,
        dailyBriefingConfig,
        dataRetentionConfig,
      ],
      envFilePath: ".env",
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...buildDatabaseOptions({
          host: configService.getOrThrow<string>("database.host"),
          port: configService.getOrThrow<number>("database.port"),
          username: configService.getOrThrow<string>("database.username"),
          password: configService.getOrThrow<string>("database.password"),
          database: configService.getOrThrow<string>("database.database"),
        }),
        autoLoadEntities: true,
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
    VisitModule,
    PropertyModule,
    CreditModule,
    InboxModule,
    DealModule,
    ContactImportModule,
    CustomerReclassificationModule,
    PropertyHuntModule,
    AssistantModule,
    OwnerFinderModule,
    DocumentLookupModule,
    BrokerPageModule,
    SubscriptionModule,
    DailyBriefingModule,
    AccountDeletionModule,
    DataRetentionModule,
  ],
  // Per broker when signed in, per address otherwise (request.ip is the
  // real client behind the proxy, see trust proxy in main.ts). Webhooks and
  // the reads of the site server skip it.
  providers: [{ provide: APP_GUARD, useClass: ApiThrottlerGuard }],
})
export class AppModule {}
