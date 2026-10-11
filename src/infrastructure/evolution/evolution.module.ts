import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EvolutionApiService } from "./services/evolution-api.service";
import { EvolutionThrottleService } from "./services/evolution-throttle.service";

@Module({
  imports: [ConfigModule],
  providers: [EvolutionApiService, EvolutionThrottleService],
  exports: [EvolutionApiService, EvolutionThrottleService],
})
export class EvolutionModule {}
