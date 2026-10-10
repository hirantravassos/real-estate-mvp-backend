import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MercadoPagoService } from "./services/mercado-pago.service";

@Module({
  imports: [ConfigModule],
  providers: [MercadoPagoService],
  exports: [MercadoPagoService],
})
export class PaymentsModule {}
