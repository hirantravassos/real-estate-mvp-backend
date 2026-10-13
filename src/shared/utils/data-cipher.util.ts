import {
  createCipheriv,
  createDecipheriv,
  createHash,
  hkdfSync,
  randomBytes,
} from "crypto";
import type { ValueTransformer } from "typeorm";

const ALGORITHM = "aes-256-gcm";
const INITIALIZATION_VECTOR_BYTES = 12;
const AUTHENTICATION_TAG_BYTES = 16;
const KEY_BYTES = 32;
const KEY_SALT = "brokerin";
const MINIMUM_SECRET_LENGTH = 32;

/** Marks a sealed personal data value, plain legacy values have no prefix. */
const SEALED_PREFIX = "enc:v1:";

export const DATA_ENCRYPTION_SECRET_NAME = "DATA_ENCRYPTION_SECRET";

/**
 * One key per purpose, derived with HKDF, so the same secret never encrypts
 * two kinds of data with the same key.
 */
export const deriveKey = (secret: string, purpose: string) =>
  Buffer.from(hkdfSync("sha256", secret, KEY_SALT, purpose, KEY_BYTES));

/** The key of the old portal credentials, kept only to read them. */
export const legacyKeyOf = (secret: string) =>
  createHash("sha256").update(secret).digest();

export const sealWithKey = (key: Buffer, plain: string) => {
  const initializationVector = randomBytes(INITIALIZATION_VECTOR_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, initializationVector);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  return [
    initializationVector.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
};

/** Null when the value was sealed with another key or is damaged. */
export const openWithKey = (key: Buffer, sealed: string) => {
  const [initializationVector, authenticationTag, encrypted] =
    sealed.split(":");
  if (!initializationVector || !authenticationTag) return null;
  const authenticationTagBuffer = Buffer.from(authenticationTag, "base64");
  // Reject a truncated tag before it reaches GCM, so integrity is not weakened.
  if (authenticationTagBuffer.length !== AUTHENTICATION_TAG_BYTES) return null;
  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      key,
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

/** Fails the boot when the secret is missing or too short to be safe. */
export const assertDataEncryptionSecret = () => {
  const secret = process.env[DATA_ENCRYPTION_SECRET_NAME]?.trim() ?? "";
  if (secret.length < MINIMUM_SECRET_LENGTH) {
    throw new Error(
      `${DATA_ENCRYPTION_SECRET_NAME} must be set with at least ${MINIMUM_SECRET_LENGTH} characters, generate one with: openssl rand -hex 32`,
    );
  }
  return secret;
};

let personalDataKey: Buffer | null = null;

/** Read on first use, after the environment is loaded. */
const personalDataKeyOf = () => {
  personalDataKey ??= deriveKey(assertDataEncryptionSecret(), "personal-data");
  return personalDataKey;
};

export const isSealedPersonalData = (value: string) =>
  value.startsWith(SEALED_PREFIX);

/** Seals a CPF, CNPJ or other identifying number before it is stored. */
export const sealPersonalData = (plain: string) =>
  isSealedPersonalData(plain)
    ? plain
    : `${SEALED_PREFIX}${sealWithKey(personalDataKeyOf(), plain)}`;

/**
 * Opens a stored value. A legacy plain value comes back as it is, so rows
 * saved before the encryption keep working until they are sealed.
 */
export const openPersonalData = (stored: string) => {
  if (!isSealedPersonalData(stored)) return stored;
  const opened = openWithKey(
    personalDataKeyOf(),
    stored.slice(SEALED_PREFIX.length),
  );
  if (opened === null) {
    throw new Error("Personal data could not be opened, check the secret");
  }
  return opened;
};

/** Column transformer: the database only ever holds the sealed value. */
export const sealedPersonalDataTransformer: ValueTransformer = {
  to: (value: string | null | undefined) =>
    typeof value === "string" && value ? sealPersonalData(value) : value,
  from: (value: string | null) =>
    typeof value === "string" && value ? openPersonalData(value) : value,
};

/** Seals the named string fields of a JSON object, or of each item of a list. */
export const sealedJsonFieldsTransformer = (
  fields: readonly string[],
): ValueTransformer => {
  const mapFields = (value: unknown, change: (text: string) => string) => {
    const mapOne = (item: unknown) => {
      if (!item || typeof item !== "object") return item;
      const copy = { ...(item as Record<string, unknown>) };
      for (const field of fields) {
        const text = copy[field];
        if (typeof text === "string" && text) copy[field] = change(text);
      }
      return copy;
    };
    return Array.isArray(value) ? value.map(mapOne) : mapOne(value);
  };
  return {
    to: (value: unknown) => mapFields(value, sealPersonalData),
    from: (value: unknown) => mapFields(value, openPersonalData),
  };
};

/** Lets the tests start from a clean key after changing the secret. */
export const resetPersonalDataKeyForTests = () => {
  personalDataKey = null;
};
