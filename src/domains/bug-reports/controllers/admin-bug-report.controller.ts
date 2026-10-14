import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from "@nestjs/common";
import { AdminOnly } from "../../admin/decorators/admin-only.decorator";
import {
  AdminBugReportListQueryDto,
  AdminBugReportUpdateDto,
} from "../dtos/bug-report.dto";
import { BugReportService } from "../services/bug-report.service";

/** Triage of the reports, backoffice only and audited like the rest of it. */
@Controller("admin/bug-reports")
export class AdminBugReportController {
  constructor(private readonly bugReportService: BugReportService) {}

  @Get("summary")
  @AdminOnly()
  summary() {
    return this.bugReportService.summary();
  }

  @Get()
  @AdminOnly()
  list(@Query() query: AdminBugReportListQueryDto) {
    return this.bugReportService.list(query);
  }

  @Get(":id")
  @AdminOnly()
  detail(@Param("id", ParseUUIDPipe) id: string) {
    return this.bugReportService.detail(id);
  }

  @Patch(":id")
  @AdminOnly()
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AdminBugReportUpdateDto,
  ) {
    return this.bugReportService.update(id, dto);
  }
}
