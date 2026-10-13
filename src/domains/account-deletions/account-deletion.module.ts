import { Module } from "@nestjs/common";
import { PaymentsModule } from "../../infrastructure/payments/payments.module";
import { StorageModule } from "../../infrastructure/storage/storage.module";
import { InboxModule } from "../inbox/inbox.module";
import { NotificationModule } from "../notifications/notification.module";
import { SubscriptionModule } from "../subscriptions/subscription.module";
import { AccountDeletionController } from "./controllers/account-deletion.controller";
import { AccountDeletionService } from "./services/account-deletion.service";

@Module({
  imports: [
    PaymentsModule,
    StorageModule,
    InboxModule,
    SubscriptionModule,
    NotificationModule,
  ],
  controllers: [AccountDeletionController],
  providers: [AccountDeletionService],
  exports: [AccountDeletionService],
})
export class AccountDeletionModule {}
