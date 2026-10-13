import {
  assertDataEncryptionSecret,
  isSealedPersonalData,
  openPersonalData,
  resetPersonalDataKeyForTests,
  sealedJsonFieldsTransformer,
  sealedPersonalDataTransformer,
  sealPersonalData,
} from "./data-cipher.util";

const SECRET = "a".repeat(64);

describe("personal data cipher", () => {
  beforeEach(() => {
    process.env.DATA_ENCRYPTION_SECRET = SECRET;
    resetPersonalDataKeyForTests();
  });

  it("seals a CPF so the database never holds it in plain text", () => {
    const sealed = sealPersonalData("12345678909");
    expect(isSealedPersonalData(sealed)).toBe(true);
    expect(sealed).not.toContain("12345678909");
    expect(openPersonalData(sealed)).toBe("12345678909");
  });

  it("gives two different sealed values for the same CPF", () => {
    expect(sealPersonalData("12345678909")).not.toBe(
      sealPersonalData("12345678909"),
    );
  });

  it("never seals twice and reads legacy plain values as they are", () => {
    const sealed = sealPersonalData("12345678909");
    expect(sealPersonalData(sealed)).toBe(sealed);
    expect(openPersonalData("12345678909")).toBe("12345678909");
  });

  it("refuses to open with another secret", () => {
    const sealed = sealPersonalData("12345678909");
    process.env.DATA_ENCRYPTION_SECRET = "b".repeat(64);
    resetPersonalDataKeyForTests();
    expect(() => openPersonalData(sealed)).toThrow();
  });

  it("fails the boot without a long enough secret", () => {
    process.env.DATA_ENCRYPTION_SECRET = "short";
    expect(() => assertDataEncryptionSecret()).toThrow(
      /DATA_ENCRYPTION_SECRET/,
    );
    delete process.env.DATA_ENCRYPTION_SECRET;
    expect(() => assertDataEncryptionSecret()).toThrow();
  });

  it("transforms columns both ways and keeps empty values", () => {
    const stored = sealedPersonalDataTransformer.to("12345678909") as string;
    expect(isSealedPersonalData(stored)).toBe(true);
    expect(sealedPersonalDataTransformer.from(stored)).toBe("12345678909");
    expect(sealedPersonalDataTransformer.to(null)).toBeNull();
  });

  it("seals only the named fields of JSON lists and objects", () => {
    const transformer = sealedJsonFieldsTransformer(["documentNumber"]);
    const owners = [{ name: "Ana", documentNumber: "12345678909" }];
    const stored = transformer.to(owners) as typeof owners;
    expect(stored[0].name).toBe("Ana");
    expect(stored[0].documentNumber).not.toBe("12345678909");
    expect(transformer.from(stored)).toEqual(owners);

    const payload = { propertyId: "p1", documentNumber: null };
    expect(transformer.to(payload)).toEqual(payload);
  });
});
