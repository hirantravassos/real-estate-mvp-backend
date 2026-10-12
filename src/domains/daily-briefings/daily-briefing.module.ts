import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OpenaiModule } from "../../infrastructure/openai/openai.module";
import { RealtimeModule } from "../../infrastructure/realtime/realtime.module";
import { AiModule } from "../ai/ai.module";
import { CreditModule } from "../credits/credit.module";
import { Customer } from "../customers/entities/customer.entity";
import { Deal } from "../deals/entities/deal.entity";
import { Conversation } from "../inbox/entities/conversation.entity";
import { Message } from "../inbox/entities/message.entity";
import { SubscriptionModule } from "../subscriptions/subscription.module";
import { User } from "../users/entities/user.entity";
import { Visit } from "../visits/entities/visit.entity";
import { DailyBriefingController } from "./controllers/daily-briefing.controller";
import { DailyBriefing } from "./entities/daily-briefing.entity";
import { DailyBriefingSchedulerService } from "./services/daily-briefing-scheduler.service";
import { DailyBriefingSnapshotService } from "./services/daily-briefing-snapshot.service";
import { DailyBriefingService } from "./services/daily-briefing.service";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      DailyBriefing,
      User,
      Customer,
      Conversation,
      Message,
      Visit,
      Deal,
    ]),
    OpenaiModule,
    RealtimeModule,
    AiModule,
    CreditModule,
    SubscriptionModule,
  ],
  controllers: [DailyBriefingController],
  providers: [
    DailyBriefingService,
    DailyBriefingSnapshotService,
    DailyBriefingSchedulerService,
  ],
})
export class DailyBriefingModule {}
