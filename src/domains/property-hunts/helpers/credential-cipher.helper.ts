import {
  deriveKey,
  legacyKeyOf,
  openWithKey,
  sealWithKey,
} from "../../../shared/utils/data-cipher.util";

const VERSION = "v2";
const LEGACY_VERSION = "v1";
const PURPOSE = "portal-credentials";

/**
 * Encrypts portal passwords and sessions with AES-256-GCM, with a key
 * derived from the secret by HKDF.
 */
export const encryptSecret = (secret: string, plain: string) =>
  `${VERSION}:${sealWithKey(deriveKey(secret, PURPOSE), plain)}`;

/**
 * Null when the value was encrypted with another secret or is damaged. The
 * v1 values, keyed by a bare SHA-256 of the secret, are still read so the
 * saved accounts keep working; they become v2 on the next save.
 */
export const decryptSecret = (secret: string, sealed: string | null) => {
  if (!sealed || !secret) return null;
  const separator = sealed.indexOf(":");
  const version = sealed.slice(0, separator);
  const body = sealed.slice(separator + 1);
  if (version === VERSION) return openWithKey(deriveKey(secret, PURPOSE), body);
  if (version === LEGACY_VERSION) return openWithKey(legacyKeyOf(secret), body);
  return null;
};
