import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EvolutionModule } from "../../infrastructure/evolution/evolution.module";
import { GoogleModule } from "../../infrastructure/google/google.module";
import { AiModule } from "../ai/ai.module";
import { CreditModule } from "../credits/credit.module";
import { CustomerModule } from "../customers/customer.module";
import { Conversation } from "../inbox/entities/conversation.entity";
import { InboxModule } from "../inbox/inbox.module";
import { Kanban } from "../kanbans/entities/kanban.entity";
import { ContactImportController } from "./controllers/contact-import.controller";
import { ContactAiAnalysisService } from "./services/contact-ai-analysis.service";
import { ContactImportService } from "./services/contact-import.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Kanban, Conversation]),
    EvolutionModule,
    GoogleModule,
    AiModule,
    CreditModule,
    CustomerModule,
    InboxModule,
  ],
  controllers: [ContactImportController],
  providers: [ContactImportService, ContactAiAnalysisService],
})
export class ContactImportModule {}
