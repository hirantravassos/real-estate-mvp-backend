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
import { ListingShortcutController } from "./controllers/listing-shortcut.controller";
import { PropertyHuntController } from "./controllers/property-hunt.controller";
import { PropertyMatchController } from "./controllers/property-match.controller";
import { ListingShortcut } from "./entities/listing-shortcut.entity";
import { PropertyHunt } from "./entities/property-hunt.entity";
import { PropertyMatch } from "./entities/property-match.entity";
import { CatalogMatcherService } from "./services/catalog-matcher.service";
import { HuntAiService } from "./services/hunt-ai.service";
import { ListingPageReaderService } from "./services/listing-page-reader.service";
import { ListingRetentionService } from "./services/listing-retention.service";
import { ListingShortcutService } from "./services/listing-shortcut.service";
import { PortalBrowserService } from "./services/portal-browser.service";
import { PropertyHuntRunnerService } from "./services/property-hunt-runner.service";
import { PropertyHuntService } from "./services/property-hunt.service";
import { PropertyMatchService } from "./services/property-match.service";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      ListingShortcut,
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
    ListingShortcutController,
    PropertyHuntController,
    PropertyMatchController,
  ],
  providers: [
    PortalBrowserService,
    HuntAiService,
    CatalogMatcherService,
    ListingShortcutService,
    ListingRetentionService,
    PropertyHuntRunnerService,
    PropertyHuntService,
    PropertyMatchService,
    ListingPageReaderService,
  ],
  exports: [ListingPageReaderService, PropertyHuntService],
})
export class PropertyHuntModule {}
