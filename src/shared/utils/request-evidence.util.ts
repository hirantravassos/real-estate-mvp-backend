import type { Request } from "express";

export interface RequestEvidence {
  ip: string | null;
  userAgent: string | null;
}

/** Who acted from where, read behind the hosting proxy. */
export const readRequestEvidence = (request: Request): RequestEvidence => {
  const forwardedFor = request.headers["x-forwarded-for"];
  const forwardedAddress = (
    Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor
  )
    ?.split(",")[0]
    ?.trim();
  const userAgent = request.headers["user-agent"];

  return {
    ip: (forwardedAddress || request.ip || null)?.substring(0, 64) ?? null,
    userAgent: userAgent ? userAgent.substring(0, 500) : null,
  };
};
