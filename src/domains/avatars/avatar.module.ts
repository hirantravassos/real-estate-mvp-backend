import { Module } from "@nestjs/common";
import { EvolutionModule } from "../../infrastructure/evolution/evolution.module";
import { RealtimeModule } from "../../infrastructure/realtime/realtime.module";
import { AiModule } from "../ai/ai.module";
import { CreditModule } from "../credits/credit.module";
import { CustomerModule } from "../customers/customer.module";
import { PhotoAvatarService } from "./services/photo-avatar.service";

@Module({
  imports: [
    AiModule,
    CreditModule,
    CustomerModule,
    EvolutionModule,
    RealtimeModule,
  ],
  providers: [PhotoAvatarService],
  exports: [PhotoAvatarService],
})
export class AvatarModule {}
