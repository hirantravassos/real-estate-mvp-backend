import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EvolutionModule } from "../../infrastructure/evolution/evolution.module";
import { RealtimeModule } from "../../infrastructure/realtime/realtime.module";
import { StorageModule } from "../../infrastructure/storage/storage.module";
import { AiModule } from "../ai/ai.module";
import { CustomerModule } from "../customers/customer.module";
import { Property } from "../properties/entities/property.entity";
import { PropertyModule } from "../properties/property.module";
import { ConversationController } from "./controllers/conversation.controller";
import { EvolutionWebhookController } from "./controllers/evolution-webhook.controller";
import { MessageController } from "./controllers/message.controller";
import { WhatsappConnectionController } from "./controllers/whatsapp-connection.controller";
import { Conversation } from "./entities/conversation.entity";
import { Message } from "./entities/message.entity";
import { WhatsappConnection } from "./entities/whatsapp-connection.entity";
import { ConversationService } from "./services/conversation.service";
import { EvolutionWebhookService } from "./services/evolution-webhook.service";
import { InboxAiService } from "./services/inbox-ai.service";
import { MessageService } from "./services/message.service";
import { PropertyPresentationSenderService } from "./services/property-presentation-sender.service";
import { WhatsappConnectionService } from "./services/whatsapp-connection.service";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      WhatsappConnection,
      Conversation,
      Message,
      Property,
    ]),
    EvolutionModule,
    RealtimeModule,
    StorageModule,
    AiModule,
    CustomerModule,
    PropertyModule,
  ],
  controllers: [
    WhatsappConnectionController,
    ConversationController,
    MessageController,
    EvolutionWebhookController,
  ],
  providers: [
    WhatsappConnectionService,
    ConversationService,
    MessageService,
    InboxAiService,
    PropertyPresentationSenderService,
    EvolutionWebhookService,
  ],
})
export class InboxModule {}
