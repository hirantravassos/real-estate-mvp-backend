import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { User } from "../../users/entities/user.entity";
import { DailyBriefingGenerateDto } from "../dtos/daily-briefing.dto";
import { DailyBriefingService } from "../services/daily-briefing.service";

@Controller("daily-briefings")
@UseGuards(JwtGuard)
export class DailyBriefingController {
  constructor(private readonly briefingService: DailyBriefingService) {}

  /** The latest briefing, today's free one state and the next sweep. */
  @Get("current")
  current(@GetUser() user: User) {
    return this.briefingService.overview(user);
  }

  /** Writes a briefing now, free once a day and paid after that. */
  @Post()
  generate(@GetUser() user: User, @Body() dto: DailyBriefingGenerateDto) {
    return this.briefingService.request(user, dto.paid === true);
  }
}
