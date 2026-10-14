import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RealtimeModule } from "../../infrastructure/realtime/realtime.module";
import { StorageModule } from "../../infrastructure/storage/storage.module";
import { AiModule } from "../ai/ai.module";
import { ContactImportModule } from "../contact-imports/contact-import.module";
import { CreditModule } from "../credits/credit.module";
import { CustomerComment } from "../customers/entities/customer-comments.entity";
import { Customer } from "../customers/entities/customer.entity";
import { CustomerModule } from "../customers/customer.module";
import { DealChecklistItem } from "../deals/entities/deal-checklist-item.entity";
import { Deal } from "../deals/entities/deal.entity";
import { DealModule } from "../deals/deal.module";
import { DocumentLookupModule } from "../document-lookups/document-lookup.module";
import { DocumentModule } from "../documents/document.module";
import { Document } from "../documents/entities/document.entity";
import { Conversation } from "../inbox/entities/conversation.entity";
import { Message } from "../inbox/entities/message.entity";
import { InboxModule } from "../inbox/inbox.module";
import { Kanban } from "../kanbans/entities/kanban.entity";
import { OwnerFinderModule } from "../owner-finder/owner-finder.module";
import { PropertyMedia } from "../properties/entities/property-media.entity";
import { Property } from "../properties/entities/property.entity";
import { PropertyHuntModule } from "../property-hunts/property-hunt.module";
import { Visit } from "../visits/entities/visit.entity";
import { VisitModule } from "../visits/visit.module";
import { AssistantController } from "./controllers/assistant.controller";
import { AssistantAction } from "./entities/assistant-action.entity";
import { AssistantChat } from "./entities/assistant-chat.entity";
import { AssistantMessage } from "./entities/assistant-message.entity";
import { AssistantActionService } from "./services/assistant-action.service";
import { AssistantChatService } from "./services/assistant-chat.service";
import { AssistantDocumentService } from "./services/assistant-document.service";
import { AssistantPaidActionService } from "./services/assistant-paid-action.service";
import { AssistantToolService } from "./services/assistant-tool.service";
import { AssistantService } from "./services/assistant.service";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      AssistantMessage,
      AssistantAction,
      AssistantChat,
      Customer,
      CustomerComment,
      Kanban,
      Visit,
      Property,
      Conversation,
      Message,
      Document,
      PropertyMedia,
      Deal,
      DealChecklistItem,
    ]),
    DocumentModule,
    StorageModule,
    AiModule,
    CustomerModule,
    InboxModule,
    VisitModule,
    RealtimeModule,
    CreditModule,
    PropertyHuntModule,
    OwnerFinderModule,
    ContactImportModule,
    DocumentLookupModule,
    DealModule,
  ],
  controllers: [AssistantController],
  providers: [
    AssistantService,
    AssistantToolService,
    AssistantActionService,
    AssistantDocumentService,
    AssistantChatService,
    AssistantPaidActionService,
  ],
})
export class AssistantModule {}
