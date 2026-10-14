import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { readRequestEvidence } from "../../../shared/utils/request-evidence.util";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { SkipSubscriptionCheck } from "../../subscriptions/decorators/subscription.decorator";
import { UserThrottlerGuard } from "../../subscriptions/guards/user-throttler.guard";
import { User } from "../../users/entities/user.entity";
import { BugReportCreateDto } from "../dtos/bug-report.dto";
import { BugReportService } from "../services/bug-report.service";

/** Reports per broker in 10 minutes, a stuck panic button stays harmless. */
const REPORTS_PER_WINDOW = 10;
const REPORTS_WINDOW_MILLISECONDS = 10 * 60_000;

/**
 * The broker only sends. Reading, triage and status live in the backoffice,
 * so there is no route here that returns somebody's report.
 */
@Controller("bug-reports")
export class BugReportController {
  constructor(private readonly bugReportService: BugReportService) {}

  /** Works without a subscription: a broker locked out must still report. */
  @Post()
  @UseGuards(JwtGuard, UserThrottlerGuard)
  @SkipSubscriptionCheck()
  @Throttle({
    default: {
      limit: REPORTS_PER_WINDOW,
      ttl: REPORTS_WINDOW_MILLISECONDS,
    },
  })
  create(
    @GetUser() user: User,
    @Body() dto: BugReportCreateDto,
    @Req() request: Request,
  ) {
    return this.bugReportService.create(
      user,
      dto,
      readRequestEvidence(request),
    );
  }
}
