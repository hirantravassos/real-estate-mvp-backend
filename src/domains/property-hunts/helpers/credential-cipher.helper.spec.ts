import { decryptSecret, encryptSecret } from "./credential-cipher.helper";

describe("credential cipher", () => {
  it("opens what it sealed", () => {
    const sealed = encryptSecret("server secret", "minha senha 123");
    expect(sealed).not.toContain("minha senha");
    expect(decryptSecret("server secret", sealed)).toBe("minha senha 123");
  });

  it("gives nothing back with another secret", () => {
    const sealed = encryptSecret("server secret", "minha senha 123");
    expect(decryptSecret("other secret", sealed)).toBeNull();
  });

  it("gives nothing back for damaged values", () => {
    expect(decryptSecret("server secret", "v1:abc")).toBeNull();
    expect(decryptSecret("server secret", null)).toBeNull();
  });
});
