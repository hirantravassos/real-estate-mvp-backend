import type { Request } from "express";

export interface RequestEvidence {
  ip: string | null;
  userAgent: string | null;
}

/**
 * Who acted from where. With `trust proxy` set, Express resolves `request.ip`
 * from the trusted proxy hop, so we never read the client supplied
 * X-Forwarded-For directly, which a signer could otherwise forge as evidence.
 */
export const readRequestEvidence = (request: Request): RequestEvidence => {
  const userAgent = request.headers["user-agent"];

  return {
    ip: request.ip ? request.ip.substring(0, 64) : null,
    userAgent: userAgent ? userAgent.substring(0, 500) : null,
  };
};
