import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OpenaiModule } from "../../infrastructure/openai/openai.module";
import { CreditModule } from "../credits/credit.module";
import { AiService } from "./services/ai.service";
import { User } from "../users/entities/user.entity";

@Module({
  imports: [OpenaiModule, CreditModule, TypeOrmModule.forFeature([User])],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
