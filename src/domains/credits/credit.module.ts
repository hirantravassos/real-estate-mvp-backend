import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OpenaiModule } from "../../infrastructure/openai/openai.module";
import { PaymentsModule } from "../../infrastructure/payments/payments.module";
import { RealtimeModule } from "../../infrastructure/realtime/realtime.module";
import { UserModule } from "../users/user.module";
import { CreditController } from "./controllers/credit.controller";
import { CreditPurchase } from "./entities/credit-purchase.entity";
import { CreditTransaction } from "./entities/credit-transaction.entity";
import { CreditWallet } from "./entities/credit-wallet.entity";
import { CreditPricingService } from "./services/credit-pricing.service";
import { CreditPurchaseService } from "./services/credit-purchase.service";
import { CreditWalletService } from "./services/credit-wallet.service";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([CreditWallet, CreditTransaction, CreditPurchase]),
    OpenaiModule,
    PaymentsModule,
    RealtimeModule,
    UserModule,
  ],
  controllers: [CreditController],
  providers: [CreditPricingService, CreditWalletService, CreditPurchaseService],
  exports: [CreditPricingService, CreditWalletService, CreditPurchaseService],
})
export class CreditModule {}
