import { Controller, Get } from "@nestjs/common";
import { PlanService } from "../services/plan.service";
import { PlanDto } from "../dtos/plan.dto";

@Controller("plan")
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Get()
  findAll(): Promise<PlanDto[]> {
    return this.planService.findAll();
  }
}
