import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { databaseConfig, authConfig, mailConfig } from './config';
import { JwtAuthGuard } from './shared/guards';

import { MailModule } from './infrastructure/mail/mail.module';
import { AuthModule } from './domains/auth/auth.module';
import { SubscriptionModule } from './domains/subscription/subscription.module';
import { KanbanModule } from './domains/kanban/kanban.module';
import { CustomerModule } from './domains/customer/customer.module';
import { CustomerHistoryModule } from './domains/customer-history/customer-history.module';
import { VisitModule } from './domains/visit/visit.module';
import { WhatsAppModule } from './domains/whatsapp/whatsapp.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, authConfig, mailConfig],
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql' as const,
        host: configService.getOrThrow<string>('database.host'),
        port: configService.getOrThrow<number>('database.port'),
        username: configService.getOrThrow<string>('database.username'),
        password: configService.getOrThrow<string>('database.password'),
        database: configService.getOrThrow<string>('database.database'),
        autoLoadEntities: true,
        synchronize: true, // Disable in production — use migrations
        logging: false,
      }),
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 30,
      },
    ]),

    MailModule,
    AuthModule,
    SubscriptionModule,
    KanbanModule,
    CustomerModule,
    CustomerHistoryModule,
    VisitModule,
    WhatsAppModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
