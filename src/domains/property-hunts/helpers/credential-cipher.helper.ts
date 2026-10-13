import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";
const INITIALIZATION_VECTOR_BYTES = 12;
const AUTHENTICATION_TAG_BYTES = 16;

const keyFrom = (secret: string) =>
  createHash("sha256").update(secret).digest();

/** Encrypts portal passwords and sessions with AES-256-GCM. */
export const encryptSecret = (secret: string, plain: string) => {
  const initializationVector = randomBytes(INITIALIZATION_VECTOR_BYTES);
  const cipher = createCipheriv(
    ALGORITHM,
    keyFrom(secret),
    initializationVector,
  );
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const authenticationTag = cipher.getAuthTag();
  return [
    VERSION,
    initializationVector.toString("base64"),
    authenticationTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
};

/** Null when the value was encrypted with another secret or is damaged. */
export const decryptSecret = (secret: string, sealed: string | null) => {
  if (!sealed) return null;
  const [version, initializationVector, authenticationTag, encrypted] =
    sealed.split(":");
  if (version !== VERSION || !initializationVector || !authenticationTag) {
    return null;
  }
  const authenticationTagBuffer = Buffer.from(authenticationTag, "base64");
  // Reject a truncated tag before it reaches GCM, so integrity is not weakened.
  if (authenticationTagBuffer.length !== AUTHENTICATION_TAG_BYTES) {
    return null;
  }
  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      keyFrom(secret),
      Buffer.from(initializationVector, "base64"),
      { authTagLength: AUTHENTICATION_TAG_BYTES },
    );
    decipher.setAuthTag(authenticationTagBuffer);
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted ?? "", "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
};
