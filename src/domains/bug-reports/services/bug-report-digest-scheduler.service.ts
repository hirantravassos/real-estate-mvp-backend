import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import dayjs from "dayjs";
import { Repository } from "typeorm";
import { adminConfig } from "../../../config/admin.config";
import { appConfig } from "../../../config/app.config";
import { bugReportConfig } from "../../../config/bug-report.config";
import { MailService } from "../../../infrastructure/mail/services/mail.service";
import { BugReportDigest } from "../entities/bug-report-digest.entity";
import {
  DIGEST_TIMEZONE,
  digestDayOf,
  digestPassedToday,
  nextDigestAt,
} from "../helpers/digest-schedule.helper";
import { bugReportDigestMail } from "../mails/bug-report.mails";
import { BugReportService } from "./bug-report.service";

/** A restart before this hour still sends the digest it missed. */
const CATCH_UP_UNTIL_HOUR = 18;
/** Fires a little after 9, never a hair before it. */
const TIMER_MARGIN_MILLISECONDS = 2_000;

/**
 * Once a day at 9 in Brasília: mails the admins how many bug reports are
 * open and drops the closed ones past retention. No mail per report, the
 * backoffice is where they are read.
 */
@Injectable()
export class BugReportDigestSchedulerService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(BugReportDigestSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @Inject(bugReportConfig.KEY)
    private readonly configuration: ConfigType<typeof bugReportConfig>,
    @Inject(adminConfig.KEY)
    private readonly adminConfiguration: ConfigType<typeof adminConfig>,
    @Inject(appConfig.KEY)
    private readonly applicationConfiguration: ConfigType<typeof appConfig>,
    @InjectRepository(BugReportDigest)
    private readonly digestRepository: Repository<BugReportDigest>,
    private readonly bugReportService: BugReportService,
    private readonly mailService: MailService,
  ) {}

  onApplicationBootstrap() {
    if (!this.configuration.digestEnabled) {
      this.logger.warn(
        "Bug report digest is off: BUG_REPORT_DIGEST_ENABLED is false",
      );
      return;
    }
    if (this.adminConfiguration.allowedEmails.length === 0) {
      this.logger.warn(
        "Bug report digest has nobody to write to: ADMIN_ALLOWED_EMAILS is empty",
      );
    }

    this.arm();
    const hour = dayjs().tz(DIGEST_TIMEZONE).hour();
    if (digestPassedToday() && hour < CATCH_UP_UNTIL_HOUR) void this.run();
  }

  onApplicationShutdown() {
    if (this.timer) clearTimeout(this.timer);
  }

  private arm() {
    const delay =
      nextDigestAt().getTime() - Date.now() + TIMER_MARGIN_MILLISECONDS;
    this.timer = setTimeout(() => {
      this.arm();
      void this.run();
    }, delay);
    this.timer.unref();
  }

  async run(now = new Date()) {
    if (this.running) return;
    this.running = true;
    try {
      const purged = await this.bugReportService.purgeExpired(now);
      const sent = await this.sendDigest(now);
      this.logger.log(
        `Bug report digest: ${sent} mails sent, ${purged} closed reports purged`,
      );
    } catch (error) {
      this.logger.error(`Bug report digest failed: ${String(error)}`);
    } finally {
      this.running = false;
    }
  }

  /** The day is claimed first: two servers never send the digest twice. */
  async sendDigest(now = new Date()): Promise<number> {
    const recipients = this.adminConfiguration.allowedEmails;
    if (recipients.length === 0) return 0;
    if (!(await this.claim(digestDayOf(dayjs(now))))) return 0;

    const summary = await this.bugReportService.summary(now);
    const message = bugReportDigestMail(
      summary,
      `${this.applicationConfiguration.frontendUrl}/admin/bugs`,
    );

    let sent = 0;
    for (const recipient of recipients) {
      if (await this.mailService.send(recipient, message)) sent++;
    }
    return sent;
  }

  private async claim(day: string): Promise<boolean> {
    const result = await this.digestRepository
      .createQueryBuilder()
      .insert()
      .into(BugReportDigest)
      .values({ day })
      .orIgnore()
      .execute();
    const affectedRows = (result.raw as { affectedRows?: number } | undefined)
      ?.affectedRows;
    return affectedRows === 1;
  }
}
