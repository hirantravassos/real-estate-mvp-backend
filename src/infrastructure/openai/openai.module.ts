import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { OpenaiService } from "./services/openai.service";

@Module({
  imports: [ConfigModule],
  providers: [OpenaiService],
  exports: [OpenaiService],
})
export class OpenaiModule {}
