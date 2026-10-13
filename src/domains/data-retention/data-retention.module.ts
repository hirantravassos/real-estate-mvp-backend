import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessLogModule } from "../access-logs/access-log.module";
import { AccountDeletionModule } from "../account-deletions/account-deletion.module";
import { NotificationModule } from "../notifications/notification.module";
import { Subscription } from "../subscriptions/entities/subscription.entity";
import { SubscriptionModule } from "../subscriptions/subscription.module";
import { User } from "../users/entities/user.entity";
import { DataRetentionSchedulerService } from "./services/data-retention-scheduler.service";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Subscription, User]),
    AccessLogModule,
    AccountDeletionModule,
    SubscriptionModule,
    NotificationModule,
  ],
  providers: [DataRetentionSchedulerService],
})
export class DataRetentionModule {}
