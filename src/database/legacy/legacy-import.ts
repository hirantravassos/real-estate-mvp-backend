import { randomUUID } from "crypto";
import {
  createConnection,
  type Connection,
  type RowDataPacket,
} from "mysql2/promise";
import { databaseConfig } from "../../config/database.config";
import {
  toInternationalDigits,
  toPhoneMatchingKey,
  toStoredCustomerPhone,
} from "./legacy-phone.helper";

/**
 * Brings one broker's kanban stages, customers, customer history and visits
 * from the 1.0.4 database into the 2.0.0 one, matching customers by phone.
 * Runs inside one transaction and rolls it back unless --apply is passed, so
 * the report of a dry run is exactly what applying would do.
 *
 *   LEGACY_DATABASE_URL  mysql://user:password@host:port/database of 1.0.4
 *   LEGACY_USER_EMAIL    the broker's email in 1.0.4
 *   TARGET_USER_EMAIL    the broker's email in 2.0.0, defaults to the above
 *   TARGET_DATABASE_URL  optional, defaults to the DATABASE_* variables
 */

interface LegacyUserRow extends RowDataPacket {
  id: string;
}

interface KanbanRow extends RowDataPacket {
  id: string;
  name: string;
  description: string | null;
  order: number;
  created_at: string;
  updated_at: string;
}

interface CustomerRow extends RowDataPacket {
  id: string;
  name: string;
  phone: string;
  budget: string | null;
  lost: number;
  active: number;
  kanbanId: string | null;
  created_at: string;
  updated_at: string;
}

interface CommentRow extends RowDataPacket {
  id: string;
  customerId: string;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

interface VisitRow extends RowDataPacket {
  id: string;
  customerId: string;
  address: string;
  reference: string | null;
  startsAt: string;
  endsAt: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ImportReport {
  kanbansMatched: string[];
  kanbansCreated: string[];
  customersMatched: number;
  customersCreated: number;
  customersReactivated: number;
  customersMerged: string[];
  customersWithInvalidPhone: string[];
  commentsCopied: number;
  commentsAlreadyThere: number;
  visitsCopied: number;
  visitsAlreadyThere: number;
}

const shouldApply = process.argv.includes("--apply");

const readRequiredVariable = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing the ${name} variable.`);
  return value;
};

/** "Atendimento", " atendimento " and "ATENDIMENTO" are the same stage. */
const toStageKey = (name: string) =>
  name.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

const connectTo = async (uri: string | null) => {
  const sharedOptions = { dateStrings: true as const, charset: "utf8mb4" };
  const { host, port, username, password, database } = databaseConfig();
  const connection = uri
    ? await createConnection({ uri, ...sharedOptions })
    : await createConnection({
        host,
        port,
        user: username,
        password,
        database,
        ...sharedOptions,
      });
  // Timestamps are copied as text, so both sides must read them the same way.
  await connection.query("SET time_zone = '+00:00'");
  return connection;
};

const findUserId = async (connection: Connection, email: string) => {
  const [rows] = await connection.query<LegacyUserRow[]>(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [email],
  );
  if (!rows[0]) throw new Error(`No user with the email ${email}.`);
  return rows[0].id;
};

const importKanbans = async (
  legacy: Connection,
  target: Connection,
  legacyUserId: string,
  targetUserId: string,
  report: ImportReport,
) => {
  const [legacyKanbans] = await legacy.query<KanbanRow[]>(
    "SELECT * FROM kanbans WHERE userId = ? AND active = 1 ORDER BY `order`, created_at",
    [legacyUserId],
  );
  const [targetKanbans] = await target.query<KanbanRow[]>(
    "SELECT * FROM kanbans WHERE userId = ? AND active = 1 ORDER BY `order`, created_at",
    [targetUserId],
  );

  const targetKanbanByKey = new Map(
    targetKanbans.map((kanban) => [toStageKey(kanban.name), kanban]),
  );
  const targetKanbanIdByLegacyId = new Map<string, string>();
  const keptTargetKanbanIds = new Set<string>();

  // The old board keeps its order, stages only the new one has go after it.
  for (const [position, legacyKanban] of legacyKanbans.entries()) {
    const matchingKanban = targetKanbanByKey.get(toStageKey(legacyKanban.name));
    if (matchingKanban && !keptTargetKanbanIds.has(matchingKanban.id)) {
      await target.query(
        "UPDATE kanbans SET `order` = ?, description = COALESCE(?, description) WHERE id = ?",
        [position, legacyKanban.description, matchingKanban.id],
      );
      keptTargetKanbanIds.add(matchingKanban.id);
      targetKanbanIdByLegacyId.set(legacyKanban.id, matchingKanban.id);
      report.kanbansMatched.push(legacyKanban.name);
      continue;
    }

    const kanbanId = randomUUID();
    await target.query(
      "INSERT INTO kanbans (id, created_at, updated_at, active, userId, name, description, `order`) VALUES (?, ?, ?, 1, ?, ?, ?, ?)",
      [
        kanbanId,
        legacyKanban.created_at,
        legacyKanban.updated_at,
        targetUserId,
        legacyKanban.name,
        legacyKanban.description,
        position,
      ],
    );
    targetKanbanIdByLegacyId.set(legacyKanban.id, kanbanId);
    report.kanbansCreated.push(legacyKanban.name);
  }

  const onlyTargetKanbans = targetKanbans.filter(
    (kanban) => !keptTargetKanbanIds.has(kanban.id),
  );
  for (const [index, kanban] of onlyTargetKanbans.entries()) {
    await target.query("UPDATE kanbans SET `order` = ? WHERE id = ?", [
      legacyKanbans.length + index,
      kanban.id,
    ]);
  }

  return targetKanbanIdByLegacyId;
};

const importCustomers = async (
  legacy: Connection,
  target: Connection,
  legacyUserId: string,
  targetUserId: string,
  targetKanbanIdByLegacyId: Map<string, string>,
  report: ImportReport,
) => {
  const [legacyCustomers] = await legacy.query<CustomerRow[]>(
    "SELECT * FROM customers WHERE userId = ? AND active = 1 ORDER BY updated_at DESC",
    [legacyUserId],
  );
  // Removed customers count too, the phone stays unique for the user.
  const [targetCustomers] = await target.query<CustomerRow[]>(
    "SELECT * FROM customers WHERE userId = ?",
    [targetUserId],
  );

  const targetCustomerByKey = new Map<string, CustomerRow>();
  for (const customer of targetCustomers) {
    const key = toPhoneMatchingKey(customer.phone);
    const current = key ? targetCustomerByKey.get(key) : undefined;
    if (key && (!current || (!current.active && customer.active))) {
      targetCustomerByKey.set(key, customer);
    }
  }

  const targetCustomerIdByLegacyId = new Map<string, string>();
  const targetCustomerIdsTouched = new Set<string>();

  // Most recently updated first, so the freshest stage wins on duplicates.
  for (const legacyCustomer of legacyCustomers) {
    const internationalDigits = toInternationalDigits(legacyCustomer.phone);
    const key = toPhoneMatchingKey(legacyCustomer.phone);
    if (!internationalDigits || !key) {
      report.customersWithInvalidPhone.push(
        `${legacyCustomer.name} (${legacyCustomer.phone})`,
      );
      continue;
    }

    const kanbanId = legacyCustomer.kanbanId
      ? (targetKanbanIdByLegacyId.get(legacyCustomer.kanbanId) ?? null)
      : null;
    const existingCustomer = targetCustomerByKey.get(key);

    if (existingCustomer && targetCustomerIdsTouched.has(existingCustomer.id)) {
      report.customersMerged.push(
        `${legacyCustomer.name} (${legacyCustomer.phone})`,
      );
      targetCustomerIdByLegacyId.set(legacyCustomer.id, existingCustomer.id);
      continue;
    }

    if (existingCustomer) {
      await target.query(
        "UPDATE customers SET kanbanId = COALESCE(?, kanbanId), lost = ?, budget = COALESCE(?, budget), active = 1 WHERE id = ?",
        [
          kanbanId,
          legacyCustomer.lost,
          legacyCustomer.budget,
          existingCustomer.id,
        ],
      );
      if (!existingCustomer.active) report.customersReactivated += 1;
      report.customersMatched += 1;
      targetCustomerIdsTouched.add(existingCustomer.id);
      targetCustomerIdByLegacyId.set(legacyCustomer.id, existingCustomer.id);
      continue;
    }

    const customerId = randomUUID();
    await target.query(
      "INSERT INTO customers (id, created_at, updated_at, active, userId, name, phone, budget, lost, kanbanId) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)",
      [
        customerId,
        legacyCustomer.created_at,
        legacyCustomer.updated_at,
        targetUserId,
        legacyCustomer.name,
        toStoredCustomerPhone(internationalDigits),
        legacyCustomer.budget,
        legacyCustomer.lost,
        kanbanId,
      ],
    );
    const createdCustomer = {
      ...legacyCustomer,
      id: customerId,
      active: 1,
    } as CustomerRow;
    targetCustomerByKey.set(key, createdCustomer);
    targetCustomerIdsTouched.add(customerId);
    targetCustomerIdByLegacyId.set(legacyCustomer.id, customerId);
    report.customersCreated += 1;
  }

  return targetCustomerIdByLegacyId;
};

const importComments = async (
  legacy: Connection,
  target: Connection,
  targetCustomerIdByLegacyId: Map<string, string>,
  report: ImportReport,
) => {
  const legacyCustomerIds = [...targetCustomerIdByLegacyId.keys()];
  if (legacyCustomerIds.length === 0) return;

  const [legacyComments] = await legacy.query<CommentRow[]>(
    "SELECT * FROM customer_comments WHERE active = 1 AND customerId IN (?) ORDER BY created_at",
    [legacyCustomerIds],
  );
  const [targetComments] = await target.query<CommentRow[]>(
    "SELECT * FROM customer_comments WHERE customerId IN (?)",
    [[...new Set(targetCustomerIdByLegacyId.values())]],
  );

  const toCommentKey = (customerId: string, comment: CommentRow) =>
    `${customerId}|${comment.created_at}|${comment.comment ?? ""}`;
  const existingCommentKeys = new Set(
    targetComments.map((comment) => toCommentKey(comment.customerId, comment)),
  );

  for (const legacyComment of legacyComments) {
    const customerId = targetCustomerIdByLegacyId.get(legacyComment.customerId);
    if (!customerId) continue;
    const commentKey = toCommentKey(customerId, legacyComment);
    if (existingCommentKeys.has(commentKey)) {
      report.commentsAlreadyThere += 1;
      continue;
    }
    await target.query(
      "INSERT INTO customer_comments (id, created_at, updated_at, active, comment, customerId) VALUES (?, ?, ?, 1, ?, ?)",
      [
        randomUUID(),
        legacyComment.created_at,
        legacyComment.updated_at,
        legacyComment.comment,
        customerId,
      ],
    );
    existingCommentKeys.add(commentKey);
    report.commentsCopied += 1;
  }
};

const importVisits = async (
  legacy: Connection,
  target: Connection,
  legacyUserId: string,
  targetUserId: string,
  targetCustomerIdByLegacyId: Map<string, string>,
  report: ImportReport,
) => {
  const [legacyVisits] = await legacy.query<VisitRow[]>(
    "SELECT * FROM visits WHERE userId = ? AND active = 1 ORDER BY startsAt",
    [legacyUserId],
  );
  const [targetVisits] = await target.query<VisitRow[]>(
    "SELECT * FROM visits WHERE userId = ?",
    [targetUserId],
  );

  const toVisitKey = (customerId: string, visit: VisitRow) =>
    `${customerId}|${visit.startsAt}|${visit.address}`;
  const existingVisitKeys = new Set(
    targetVisits.map((visit) => toVisitKey(visit.customerId, visit)),
  );

  for (const legacyVisit of legacyVisits) {
    const customerId = targetCustomerIdByLegacyId.get(legacyVisit.customerId);
    if (!customerId) continue;
    const visitKey = toVisitKey(customerId, legacyVisit);
    if (existingVisitKeys.has(visitKey)) {
      report.visitsAlreadyThere += 1;
      continue;
    }
    // Properties are not brought over, the address keeps where it was.
    await target.query(
      "INSERT INTO visits (id, created_at, updated_at, active, userId, customerId, address, reference, startsAt, endsAt, notes, propertyId) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, NULL)",
      [
        randomUUID(),
        legacyVisit.created_at,
        legacyVisit.updated_at,
        targetUserId,
        customerId,
        legacyVisit.address,
        legacyVisit.reference,
        legacyVisit.startsAt,
        legacyVisit.endsAt,
        legacyVisit.notes,
      ],
    );
    existingVisitKeys.add(visitKey);
    report.visitsCopied += 1;
  }
};

const printReport = (report: ImportReport) => {
  const lines = [
    shouldApply
      ? "Applied."
      : "Dry run, nothing was saved. Run again with --apply to save.",
    `Stages matched by name: ${report.kanbansMatched.join(", ") || "none"}`,
    `Stages created: ${report.kanbansCreated.join(", ") || "none"}`,
    `Customers matched by phone: ${report.customersMatched}`,
    `Customers created: ${report.customersCreated}`,
    `Customers reactivated: ${report.customersReactivated}`,
    `Comments copied: ${report.commentsCopied} (already there: ${report.commentsAlreadyThere})`,
    `Visits copied: ${report.visitsCopied} (already there: ${report.visitsAlreadyThere})`,
  ];
  if (report.customersMerged.length > 0) {
    lines.push(
      "Same phone as another old customer, history joined into one:",
      ...report.customersMerged.map((customer) => `  ${customer}`),
    );
  }
  if (report.customersWithInvalidPhone.length > 0) {
    lines.push(
      "Skipped, the phone is not a number:",
      ...report.customersWithInvalidPhone.map((customer) => `  ${customer}`),
    );
  }
  console.log(lines.join("\n"));
};

const run = async () => {
  try {
    process.loadEnvFile(".env");
  } catch {
    // No .env file, the variables come from the environment.
  }

  const legacyEmail = readRequiredVariable("LEGACY_USER_EMAIL");
  const targetEmail = process.env.TARGET_USER_EMAIL || legacyEmail;
  const legacy = await connectTo(readRequiredVariable("LEGACY_DATABASE_URL"));
  const target = await connectTo(process.env.TARGET_DATABASE_URL || null);

  const report: ImportReport = {
    kanbansMatched: [],
    kanbansCreated: [],
    customersMatched: 0,
    customersCreated: 0,
    customersReactivated: 0,
    customersMerged: [],
    customersWithInvalidPhone: [],
    commentsCopied: 0,
    commentsAlreadyThere: 0,
    visitsCopied: 0,
    visitsAlreadyThere: 0,
  };

  try {
    const legacyUserId = await findUserId(legacy, legacyEmail);
    const targetUserId = await findUserId(target, targetEmail);

    await target.beginTransaction();
    const targetKanbanIdByLegacyId = await importKanbans(
      legacy,
      target,
      legacyUserId,
      targetUserId,
      report,
    );
    const targetCustomerIdByLegacyId = await importCustomers(
      legacy,
      target,
      legacyUserId,
      targetUserId,
      targetKanbanIdByLegacyId,
      report,
    );
    await importComments(legacy, target, targetCustomerIdByLegacyId, report);
    await importVisits(
      legacy,
      target,
      legacyUserId,
      targetUserId,
      targetCustomerIdByLegacyId,
      report,
    );

    if (shouldApply) await target.commit();
    else await target.rollback();
    printReport(report);
  } catch (error) {
    await target.rollback().catch(() => undefined);
    throw error;
  } finally {
    await legacy.end();
    await target.end();
  }
};

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
