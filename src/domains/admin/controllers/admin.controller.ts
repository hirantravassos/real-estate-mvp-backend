import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { readRequestEvidence } from "../../../shared/utils/request-evidence.util";
import { SkipAudit } from "../../audit-logs/decorators/audit.decorator";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { SkipSubscriptionCheck } from "../../subscriptions/decorators/subscription.decorator";
import { User } from "../../users/entities/user.entity";
import { AdminOnly } from "../decorators/admin-only.decorator";
import {
  AdminAuditLogQueryDto,
  AdminSessionCreateDto,
  AdminUserListQueryDto,
} from "../dtos/admin.dto";
import { AdminDirectoryService } from "../services/admin-directory.service";
import { AdminSessionService } from "../services/admin-session.service";

/** Session attempts per broker in 15 minutes, on top of the audited lockout. */
const SESSION_ATTEMPTS_PER_WINDOW = 5;
const SESSION_ATTEMPTS_WINDOW_MILLISECONDS = 15 * 60_000;

@Controller("admin")
export class AdminController {
  constructor(
    private readonly adminSessionService: AdminSessionService,
    private readonly adminDirectoryService: AdminDirectoryService,
  ) {}

  /** Opens a short admin session, the service audits every attempt. */
  @Post("sessions")
  @UseGuards(JwtGuard)
  @SkipSubscriptionCheck()
  @SkipAudit()
  @Throttle({
    default: {
      limit: SESSION_ATTEMPTS_PER_WINDOW,
      ttl: SESSION_ATTEMPTS_WINDOW_MILLISECONDS,
    },
  })
  openSession(
    @GetUser() user: User,
    @Body() dto: AdminSessionCreateDto,
    @Req() request: Request,
  ) {
    return this.adminSessionService.open(
      user,
      dto.idToken,
      dto.accessKey,
      readRequestEvidence(request),
    );
  }

  @Get("overview")
  @AdminOnly()
  overview() {
    return this.adminDirectoryService.overview();
  }

  @Get("users")
  @AdminOnly()
  users(@Query() query: AdminUserListQueryDto) {
    return this.adminDirectoryService.listUsers(query);
  }

  @Get("audit-logs")
  @AdminOnly()
  auditLogs(@Query() query: AdminAuditLogQueryDto) {
    return this.adminDirectoryService.listAuditLogs(query);
  }
}
