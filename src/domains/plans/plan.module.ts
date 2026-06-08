import { Module } from "@nestjs/common";
import { Plan } from "./entities/plan.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PlanService } from "./services/plan.service";
import { PlanController } from "./controllers/plan.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Plan])],
  controllers: [PlanController],
  providers: [PlanService],
  exports: [PlanService],
})
export class PlanModule {}
