import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Plan } from "../entities/plan.entity";
import { Repository } from "typeorm";
import { PlanMapper } from "../mappers/plan.mapper";
import { AuthService } from "../../auth/services/auth.service";

@Injectable()
export class PlanService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Plan) private readonly planRepository: Repository<Plan>,
  ) {}

  async findAll() {
    const plans = await this.planRepository.find({ where: { active: true } });
    return plans?.map((i) => PlanMapper.toDto(i));
  }
}
