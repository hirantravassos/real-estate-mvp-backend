import type { Request } from "express";

const MAXIMUM_DETAIL_LENGTH = 500;

export type AuditableRequest = Request & { auditDetail?: string };

/**
 * Adds a short note to the entry the audit trail writes for this request,
 * like who received a credit grant. Never pass a secret or a token.
 */
export const attachAuditDetail = (request: Request, detail: string): void => {
  (request as AuditableRequest).auditDetail = detail.substring(
    0,
    MAXIMUM_DETAIL_LENGTH,
  );
};

export const readAuditDetail = (request: Request): string | null =>
  (request as AuditableRequest).auditDetail ?? null;
