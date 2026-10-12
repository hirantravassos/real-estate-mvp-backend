import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AiModule } from "../ai/ai.module";
import { CreditModule } from "../credits/credit.module";
import { CustomerModule } from "../customers/customer.module";
import { Deal } from "../deals/entities/deal.entity";
import { Conversation } from "../inbox/entities/conversation.entity";
import { Message } from "../inbox/entities/message.entity";
import { Kanban } from "../kanbans/entities/kanban.entity";
import { CustomerReclassificationController } from "./controllers/customer-reclassification.controller";
import { CustomerReclassificationAiService } from "./services/customer-reclassification-ai.service";
import { CustomerReclassificationService } from "./services/customer-reclassification.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Kanban, Conversation, Message, Deal]),
    AiModule,
    CreditModule,
    CustomerModule,
  ],
  controllers: [CustomerReclassificationController],
  providers: [
    CustomerReclassificationService,
    CustomerReclassificationAiService,
  ],
  exports: [CustomerReclassificationService, CustomerReclassificationAiService],
})
export class CustomerReclassificationModule {}
