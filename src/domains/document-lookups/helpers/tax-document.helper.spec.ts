import { normalizeTaxDocument, taxDocumentKindOf } from "./tax-document.helper";

describe("normalizeTaxDocument", () => {
  it("keeps a valid CPF as digits", () => {
    expect(normalizeTaxDocument("529.982.247-25")).toBe("52998224725");
  });

  it("keeps a valid CNPJ as digits", () => {
    expect(normalizeTaxDocument("11.222.333/0001-81")).toBe("11222333000181");
  });

  it("refuses wrong check digits", () => {
    expect(normalizeTaxDocument("529.982.247-24")).toBeNull();
    expect(normalizeTaxDocument("11.222.333/0001-80")).toBeNull();
  });

  it("refuses repeated digits and other sizes", () => {
    expect(normalizeTaxDocument("111.111.111-11")).toBeNull();
    expect(normalizeTaxDocument("1234")).toBeNull();
  });
});

describe("taxDocumentKindOf", () => {
  it("tells a CPF from a CNPJ", () => {
    expect(taxDocumentKindOf("52998224725")).toBe("cpf");
    expect(taxDocumentKindOf("11222333000181")).toBe("cnpj");
  });
});
