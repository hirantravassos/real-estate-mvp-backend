import { Module } from "@nestjs/common";
import { UserModule } from "../users/user.module";
import { PropertyModule } from "../properties/property.module";
import { BrokerPageController } from "./controllers/broker-page.controller";
import { BrokerPageService } from "./services/broker-page.service";

@Module({
  imports: [UserModule, PropertyModule],
  controllers: [BrokerPageController],
  providers: [BrokerPageService],
})
export class BrokerPageModule {}
