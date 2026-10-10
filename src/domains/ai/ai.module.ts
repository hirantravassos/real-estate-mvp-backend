import { Module } from "@nestjs/common";
import { OpenaiModule } from "../../infrastructure/openai/openai.module";
import { CreditModule } from "../credits/credit.module";
import { AiService } from "./services/ai.service";

@Module({
  imports: [OpenaiModule, CreditModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
