import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { User } from "../../users/entities/user.entity";
import {
  ReclassificationAnalysisDto,
  ReclassificationApplyDto,
} from "../dtos/customer-reclassification.dto";
import { CustomerReclassificationAiService } from "../services/customer-reclassification-ai.service";
import { CustomerReclassificationService } from "../services/customer-reclassification.service";

/**
 * The AI reviews the funnel and suggests moves, lost and deletes; nothing
 * changes until the broker confirms.
 */
@Controller("customer-reclassifications")
@UseGuards(JwtGuard)
export class CustomerReclassificationController {
  constructor(
    private readonly reclassificationService: CustomerReclassificationService,
    private readonly reclassificationAiService: CustomerReclassificationAiService,
  ) {}

  @Get("candidates")
  candidates(@GetUser() user: User) {
    return this.reclassificationService.candidates(user);
  }

  @Post("analysis")
  analyze(@GetUser() user: User, @Body() dto: ReclassificationAnalysisDto) {
    return this.reclassificationAiService.analyze(user, dto);
  }

  @Post("apply")
  apply(@GetUser() user: User, @Body() dto: ReclassificationApplyDto) {
    return this.reclassificationService.apply(user, dto);
  }
}
