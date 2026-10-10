import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EvolutionApiService } from "./services/evolution-api.service";

@Module({
  imports: [ConfigModule],
  providers: [EvolutionApiService],
  exports: [EvolutionApiService],
})
export class EvolutionModule {}
