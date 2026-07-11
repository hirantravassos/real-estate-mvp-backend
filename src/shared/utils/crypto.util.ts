import { createCipheriv, createDecipheriv, scrypt, timingSafeEqual } from "crypto";
import { randomBytes } from "node:crypto";

const AES_ALGORITHM = "aes-256-gcm";
const AES_IV_LENGTH = 12;

export class CryptoUtils {
  /**
   * Validates a plain text password against a stored native scrypt hash.
   *
   * @param plainTextPassword - The raw password entered by the user.
   * @param storedPasswordHash - The secure hash from the database, formatted as "salt:hash".
   * @returns A promise that resolves to true if the password matches, otherwise false.
   */
  static async validateHash(
    plainTextPassword: string,
    storedPasswordHash: string,
  ): Promise<boolean> {
    const [salt, key] = storedPasswordHash.split(":");
    const keyBuffer = Buffer.from(key, "hex");

    return new Promise((resolve, reject) => {
      scrypt(plainTextPassword, salt, 64, (error, derivedKey) => {
        if (error) {
          return reject(error);
        }

        const isMatch = timingSafeEqual(keyBuffer, derivedKey);
        resolve(isMatch);
      });
    });
  }

  /**
   * Hashes a plain text password using native Node.js scrypt.
   *
   * @param plainTextPassword - The raw password to encrypt.
   * @returns A promise that resolves to the combined "salt:hash" string.
   */
  static async hashPassword(plainTextPassword: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = randomBytes(16).toString("hex");

      scrypt(plainTextPassword, salt, 64, (error, derivedKey) => {
        if (error) {
          return reject(error);
        }

        const hash = derivedKey.toString("hex");

        resolve(`${salt}:${hash}`);
      });
    });
  }

  /**
   * Encrypts a plain text value (e.g. a Google refresh token) so it can be
   * stored at rest while still being reversible for later API calls.
   *
   * @param plainText - The value to encrypt.
   * @param encryptionKey - A base64-encoded 32-byte key.
   * @returns A combined "iv:authTag:ciphertext" string, all hex-encoded.
   */
  static encrypt(plainText: string, encryptionKey: string): string {
    const key = Buffer.from(encryptionKey, "base64");
    const iv = randomBytes(AES_IV_LENGTH);
    const cipher = createCipheriv(AES_ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plainText, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
  }

  /**
   * Decrypts a value produced by {@link CryptoUtils.encrypt}.
   *
   * @param encryptedText - The "iv:authTag:ciphertext" string to decrypt.
   * @param encryptionKey - The same base64-encoded 32-byte key used to encrypt it.
   */
  static decrypt(encryptedText: string, encryptionKey: string): string {
    const [ivHex, authTagHex, cipherTextHex] = encryptedText.split(":");
    const key = Buffer.from(encryptionKey, "base64");
    const decipher = createDecipheriv(
      AES_ALGORITHM,
      key,
      Buffer.from(ivHex, "hex"),
    );
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(cipherTextHex, "hex")),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  }
}
