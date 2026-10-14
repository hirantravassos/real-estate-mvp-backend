import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MailModule } from "../../infrastructure/mail/mail.module";
import { AdminModule } from "../admin/admin.module";
import { UserThrottlerGuard } from "../subscriptions/guards/user-throttler.guard";
import { AdminBugReportController } from "./controllers/admin-bug-report.controller";
import { BugReportController } from "./controllers/bug-report.controller";
import { BugReportDigest } from "./entities/bug-report-digest.entity";
import { BugReport } from "./entities/bug-report.entity";
import { BugReportDigestSchedulerService } from "./services/bug-report-digest-scheduler.service";
import { BugReportService } from "./services/bug-report.service";

/**
 * Problems reported from inside the app (button, shake, panic, crash screen)
 * with their telemetry, the backoffice triage and the daily admin digest.
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([BugReport, BugReportDigest]),
    AdminModule,
    MailModule,
  ],
  controllers: [BugReportController, AdminBugReportController],
  providers: [
    BugReportService,
    BugReportDigestSchedulerService,
    UserThrottlerGuard,
  ],
})
export class BugReportModule {}
