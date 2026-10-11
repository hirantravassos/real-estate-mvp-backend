import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RealtimeModule } from "../../infrastructure/realtime/realtime.module";
import { StorageModule } from "../../infrastructure/storage/storage.module";
import { AiModule } from "../ai/ai.module";
import { CreditModule } from "../credits/credit.module";
import { Customer } from "../customers/entities/customer.entity";
import { CustomerModule } from "../customers/customer.module";
import { Conversation } from "../inbox/entities/conversation.entity";
import { Message } from "../inbox/entities/message.entity";
import { WhatsappConnection } from "../inbox/entities/whatsapp-connection.entity";
import { InboxModule } from "../inbox/inbox.module";
import { PropertyMedia } from "../properties/entities/property-media.entity";
import { Property } from "../properties/entities/property.entity";
import { PortalAccountController } from "./controllers/portal-account.controller";
import { PropertyHuntController } from "./controllers/property-hunt.controller";
import { PropertyMatchController } from "./controllers/property-match.controller";
import { PortalAccount } from "./entities/portal-account.entity";
import { PropertyHunt } from "./entities/property-hunt.entity";
import { PropertyMatch } from "./entities/property-match.entity";
import { CatalogMatcherService } from "./services/catalog-matcher.service";
import { HuntAiService } from "./services/hunt-ai.service";
import { ListingImportService } from "./services/listing-import.service";
import { ListingPageReaderService } from "./services/listing-page-reader.service";
import { PortalAccountService } from "./services/portal-account.service";
import { PortalBrowserService } from "./services/portal-browser.service";
import { PortalSessionService } from "./services/portal-session.service";
import { PropertyHuntRunnerService } from "./services/property-hunt-runner.service";
import { PropertyHuntService } from "./services/property-hunt.service";
import { PropertyMatchService } from "./services/property-match.service";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      PortalAccount,
      PropertyHunt,
      PropertyMatch,
      Property,
      PropertyMedia,
      Customer,
      Conversation,
      Message,
      WhatsappConnection,
    ]),
    RealtimeModule,
    StorageModule,
    AiModule,
    CreditModule,
    CustomerModule,
    InboxModule,
  ],
  controllers: [
    PortalAccountController,
    PropertyHuntController,
    PropertyMatchController,
  ],
  providers: [
    PortalBrowserService,
    PortalSessionService,
    PortalAccountService,
    HuntAiService,
    CatalogMatcherService,
    ListingImportService,
    PropertyHuntRunnerService,
    PropertyHuntService,
    PropertyMatchService,
    ListingPageReaderService,
  ],
  exports: [ListingPageReaderService, PropertyHuntService],
})
export class PropertyHuntModule {}
