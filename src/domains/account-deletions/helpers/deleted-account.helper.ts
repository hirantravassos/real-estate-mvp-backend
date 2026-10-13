import { createHash, randomUUID } from "crypto";

const DELETED_GOOGLE_ID_PREFIX = "deleted:";

/**
 * One way mark of the Google account of a deleted broker. It cannot give the
 * person back, it only tells that the same Google account already used its
 * free trial, so deleting and signing up again does not renew it.
 */
export const deletedGoogleIdOf = (googleId: string) =>
  `${DELETED_GOOGLE_ID_PREFIX}${createHash("sha256").update(googleId).digest("hex")}`;

/** Unique and unreachable, the .invalid domain never receives mail. */
export const anonymousEmail = () => `excluido-${randomUUID()}@removido.invalid`;

export const ANONYMOUS_NAME = "Conta excluída";
