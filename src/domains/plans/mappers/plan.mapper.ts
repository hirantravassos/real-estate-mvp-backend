import { Plan } from "../entities/plan.entity";
import { PlanDto } from "../dtos/plan.dto";

export class PlanMapper {
  static toDto(entity: Plan): PlanDto {
    return {
      id: entity.id,
      name: entity.name,
      price: entity.price,
      bulletPoints: entity.bulletPoints?.split(";"),
    };
  }
}
