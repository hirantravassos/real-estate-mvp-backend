import { ConfigType } from "@nestjs/config";
import { Repository } from "typeorm";
import { adminConfig } from "../../../config/admin.config";
import { appConfig } from "../../../config/app.config";
import { MailService } from "../../../infrastructure/mail/services/mail.service";
import { MailMessage } from "../../../infrastructure/mail/templates/mail-layout.template";
import { BugReportDigest } from "../entities/bug-report-digest.entity";
import { BugReportDigestSchedulerService } from "./bug-report-digest-scheduler.service";
import { BugReportService } from "./bug-report.service";

const summary = {
  open: 3,
  inProgress: 1,
  criticalUnresolved: 1,
  highUnresolved: 2,
  newLast24Hours: 2,
  resolvedLast24Hours: 0,
  oldestUnresolvedAt: "2026-10-10T12:00:00.000Z",
};

const buildScheduler = (allowedEmails: string[], claimed: boolean) => {
  const execute = jest
    .fn()
    .mockResolvedValue({ raw: { affectedRows: claimed ? 1 : 0 } });
  const builder = {
    insert: () => builder,
    into: () => builder,
    values: () => builder,
    orIgnore: () => builder,
    execute,
  };
  const send = jest.fn().mockResolvedValue(true);
  const scheduler = new BugReportDigestSchedulerService(
    { digestEnabled: true },
    { allowedEmails } as unknown as ConfigType<typeof adminConfig>,
    { frontendUrl: "https://app.example.com" } as ConfigType<typeof appConfig>,
    {
      createQueryBuilder: () => builder,
    } as unknown as Repository<BugReportDigest>,
    {
      summary: jest.fn().mockResolvedValue(summary),
      purgeExpired: jest.fn().mockResolvedValue(0),
    } as unknown as BugReportService,
    { send } as unknown as MailService,
  );
  return { scheduler, send, execute };
};

describe("BugReportDigestSchedulerService", () => {
  it("mails every admin the open count, with no report content", async () => {
    const { scheduler, send } = buildScheduler(
      ["owner@example.com", "partner@example.com"],
      true,
    );

    await expect(scheduler.sendDigest()).resolves.toBe(2);

    const calls = send.mock.calls as [string, MailMessage][];
    const message = calls[0][1];
    expect(calls.map((call) => call[0])).toEqual([
      "owner@example.com",
      "partner@example.com",
    ]);
    expect(message.subject).toContain("4 bugs abertos");
    expect(message.action?.url).toBe("https://app.example.com/admin/bugs");
  });

  it("sends nothing when another server already claimed the day", async () => {
    const { scheduler, send } = buildScheduler(["owner@example.com"], false);
    await expect(scheduler.sendDigest()).resolves.toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  it("does not claim the day without anybody to write to", async () => {
    const { scheduler, execute } = buildScheduler([], true);
    await expect(scheduler.sendDigest()).resolves.toBe(0);
    expect(execute).not.toHaveBeenCalled();
  });
});
