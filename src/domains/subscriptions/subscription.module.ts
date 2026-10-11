import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PaymentsModule } from "../../infrastructure/payments/payments.module";
import { CreditModule } from "../credits/credit.module";
import { MercadoPagoWebhookController } from "./controllers/mercado-pago-webhook.controller";
import { SubscriptionController } from "./controllers/subscription.controller";
import { SubscriptionPayment } from "./entities/subscription-payment.entity";
import { Subscription } from "./entities/subscription.entity";
import { UserThrottlerGuard } from "./guards/user-throttler.guard";
import { SubscriptionAccessInterceptor } from "./interceptors/subscription-access.interceptor";
import { SubscriptionBillingService } from "./services/subscription-billing.service";
import { SubscriptionService } from "./services/subscription.service";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Subscription, SubscriptionPayment]),
    PaymentsModule,
    CreditModule,
  ],
  controllers: [SubscriptionController, MercadoPagoWebhookController],
  providers: [
    SubscriptionService,
    SubscriptionBillingService,
    UserThrottlerGuard,
    { provide: APP_INTERCEPTOR, useClass: SubscriptionAccessInterceptor },
  ],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
