import { NotFoundException, ValidationPipe } from "@nestjs/common";
import { Repository } from "typeorm";
import { AuditLogService } from "../../audit-logs/services/audit-log.service";
import { User } from "../../users/entities/user.entity";
import {
  AdminBugReportUpdateDto,
  BugReportCreateDto,
} from "../dtos/bug-report.dto";
import { BugReport } from "../entities/bug-report.entity";
import {
  BugReportSeverity,
  BugReportSource,
  BugReportStatus,
} from "../enums/bug-report.enum";
import { BugReportService } from "./bug-report.service";

const firstBroker = { id: "11111111-1111-4111-8111-111111111111" } as User;

const evidence = { ip: "203.0.113.7", userAgent: "Mozilla/5.0" };

const buildService = (stored: BugReport | null = null) => {
  const repository = {
    create: jest.fn((values: Partial<BugReport>) => ({ ...values })),
    save: jest.fn((entity: BugReport) =>
      Promise.resolve({
        ...entity,
        id: entity.id ?? "aaaaaaaa-1111-4111-8111-111111111111",
        createdAt: new Date("2026-10-14T12:00:00.000Z"),
        updatedAt: new Date("2026-10-14T12:00:00.000Z"),
      }),
    ),
    findOne: jest.fn().mockResolvedValue(stored),
    countBy: jest.fn().mockResolvedValue(1),
  };
  const auditLogService = {
    findForUserBetween: jest.fn().mockResolvedValue([]),
  };
  const service = new BugReportService(
    repository as unknown as Repository<BugReport>,
    auditLogService as unknown as AuditLogService,
  );
  return { service, repository };
};

const validationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

describe("BugReportService", () => {
  it("binds the report to the signed in broker and decides the severity", async () => {
    const { service, repository } = buildService();

    const receipt = await service.create(
      firstBroker,
      {
        source: BugReportSource.PANIC,
        description: "Travou tudo, token Bearer abc.def.ghi",
        telemetry: {
          page: { path: "/deals/1?secret=1" },
          errors: [{ kind: "error", message: "boom" }],
        },
      },
      evidence,
    );

    const created = repository.create.mock.calls[0][0];
    expect(created.userId).toBe(firstBroker.id);
    expect(created.severity).toBe(BugReportSeverity.CRITICAL);
    expect(created.status).toBe(BugReportStatus.OPEN);
    expect(created.pagePath).toBe("/deals/1");
    expect(created.errorMessage).toBe("boom");
    expect(created.description).not.toContain("abc.def.ghi");
    expect(created.ip).toBe(evidence.ip);
    expect(receipt.reference).toBe("AAAAAAAA");
  });

  it("refuses a body that tries to set the owner, the severity or the status", async () => {
    for (const forbidden of [
      { userId: "22222222-2222-4222-8222-222222222222" },
      { user: { id: "22222222-2222-4222-8222-222222222222" } },
      { severity: "normal" },
      { status: "resolved" },
    ]) {
      await expect(
        validationPipe.transform(
          { source: "button", ...forbidden },
          { type: "body", metatype: BugReportCreateDto },
        ),
      ).rejects.toBeDefined();
    }
  });

  it("returns 404 and writes nothing when the report does not exist", async () => {
    const { service, repository } = buildService(null);
    const dto = { status: BugReportStatus.RESOLVED } as AdminBugReportUpdateDto;

    await expect(
      service.update("33333333-3333-4333-8333-333333333333", dto),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("stamps the resolution once and clears it when reopened", async () => {
    const stored = {
      id: "44444444-4444-4444-8444-444444444444",
      userId: firstBroker.id,
      status: BugReportStatus.OPEN,
      resolvedAt: null,
      resolutionNote: null,
      createdAt: new Date("2026-10-14T12:00:00.000Z"),
      updatedAt: new Date("2026-10-14T12:00:00.000Z"),
      user: { id: firstBroker.id, name: "Ana", email: "ana@example.com" },
    } as unknown as BugReport;
    const { service, repository } = buildService(stored);

    await service.update(stored.id, {
      status: BugReportStatus.RESOLVED,
      resolutionNote: "  Corrigido no deploy de hoje  ",
    });
    expect(stored.resolvedAt).toBeInstanceOf(Date);
    expect(stored.resolutionNote).toBe("Corrigido no deploy de hoje");

    await service.update(stored.id, { status: BugReportStatus.OPEN });
    expect(stored.resolvedAt).toBeNull();
    expect(repository.save).toHaveBeenCalledTimes(2);
  });
});
