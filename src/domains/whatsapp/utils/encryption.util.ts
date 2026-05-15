import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;

export function encryptToken(token: string, keyBase64: string): string {
  const key = Buffer.from(keyBase64, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(`Encryption key must be exactly ${KEY_BYTES} bytes`);
  }
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(
    ".",
  );
}

export function decryptToken(encryptedToken: string, keyBase64: string): string {
  const key = Buffer.from(keyBase64, "base64");
  const parts = encryptedToken.split(".");
  if (parts.length !== 3) throw new Error("Invalid encrypted token format");
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}

/** Verifies Meta's X-Hub-Signature-256 header against raw body */
export function verifyWebhookSignature(
  rawBody: Buffer,
  signature: string,
  appSecret: string,
): boolean {
  if (!signature.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");
  const expectedBuffer = Buffer.from(`sha256=${expected}`, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");
  if (expectedBuffer.length !== signatureBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, signatureBuffer);
}
