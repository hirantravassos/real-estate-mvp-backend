import { createCipheriv, createHash, randomBytes } from "crypto";
import { decryptSecret, encryptSecret } from "./credential-cipher.helper";

/** What the old v1 code wrote: key is a bare SHA-256 of the secret. */
const legacySeal = (secret: string, plain: string) => {
  const initializationVector = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    createHash("sha256").update(secret).digest(),
    initializationVector,
  );
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  return [
    "v1",
    initializationVector.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
};

describe("credential cipher", () => {
  it("opens what it sealed, with the HKDF key", () => {
    const sealed = encryptSecret("server secret", "minha senha 123");
    expect(sealed.startsWith("v2:")).toBe(true);
    expect(sealed).not.toContain("minha senha");
    expect(decryptSecret("server secret", sealed)).toBe("minha senha 123");
  });

  it("still reads the accounts saved with the old v1 key", () => {
    const sealed = legacySeal("server secret", "senha antiga");
    expect(decryptSecret("server secret", sealed)).toBe("senha antiga");
  });

  it("gives nothing back with another secret or without one", () => {
    const sealed = encryptSecret("server secret", "minha senha 123");
    expect(decryptSecret("other secret", sealed)).toBeNull();
    expect(decryptSecret("", sealed)).toBeNull();
  });

  it("gives nothing back for damaged values", () => {
    expect(decryptSecret("server secret", "v1:abc")).toBeNull();
    expect(decryptSecret("server secret", "v2:abc")).toBeNull();
    expect(decryptSecret("server secret", null)).toBeNull();
  });
});
