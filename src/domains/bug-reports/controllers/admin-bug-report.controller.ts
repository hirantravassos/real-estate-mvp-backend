import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  StreamableFile,
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

  /** Inline is safe: the type comes from the real bytes, checked on upload. */
  @Get(":id/screenshot")
  @AdminOnly()
  @Header("Cache-Control", "private, no-store")
  async screenshot(@Param("id", ParseUUIDPipe) id: string) {
    const file = await this.bugReportService.screenshot(id);
    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `inline; filename="${file.fileName}"`,
      length: file.buffer.length,
    });
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
