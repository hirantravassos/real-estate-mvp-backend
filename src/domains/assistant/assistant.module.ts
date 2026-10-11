import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RealtimeModule } from "../../infrastructure/realtime/realtime.module";
import { AiModule } from "../ai/ai.module";
import { CustomerComment } from "../customers/entities/customer-comments.entity";
import { Customer } from "../customers/entities/customer.entity";
import { CustomerModule } from "../customers/customer.module";
import { Conversation } from "../inbox/entities/conversation.entity";
import { Message } from "../inbox/entities/message.entity";
import { InboxModule } from "../inbox/inbox.module";
import { Kanban } from "../kanbans/entities/kanban.entity";
import { Property } from "../properties/entities/property.entity";
import { Visit } from "../visits/entities/visit.entity";
import { VisitModule } from "../visits/visit.module";
import { AssistantController } from "./controllers/assistant.controller";
import { AssistantAction } from "./entities/assistant-action.entity";
import { AssistantMessage } from "./entities/assistant-message.entity";
import { AssistantActionService } from "./services/assistant-action.service";
import { AssistantToolService } from "./services/assistant-tool.service";
import { AssistantService } from "./services/assistant.service";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      AssistantMessage,
      AssistantAction,
      Customer,
      CustomerComment,
      Kanban,
      Visit,
      Property,
      Conversation,
      Message,
    ]),
    AiModule,
    CustomerModule,
    InboxModule,
    VisitModule,
    RealtimeModule,
  ],
  controllers: [AssistantController],
  providers: [AssistantService, AssistantToolService, AssistantActionService],
})
export class AssistantModule {}
