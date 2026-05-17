import { scrypt, timingSafeEqual } from "crypto";
import { randomBytes } from "node:crypto";

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
}
