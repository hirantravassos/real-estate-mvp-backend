import { isReservedSlug, SLUG_PATTERN, slugify } from "./user-slug.helper";

describe("slugify", () => {
  it("drops accents, spaces and symbols", () => {
    expect(slugify("  Maria Souza Imóveis! ")).toBe("maria-souza-imoveis");
  });

  it("collapses repeated separators", () => {
    expect(slugify("João -- da   Silva")).toBe("joao-da-silva");
  });

  it("never ends with a dash after trimming the length", () => {
    const slug = slugify(`${"a".repeat(59)} bcd`);
    expect(slug.endsWith("-")).toBe(false);
    expect(slug.length).toBeLessThanOrEqual(60);
  });

  it("produces valid slugs", () => {
    expect(SLUG_PATTERN.test(slugify("Ana Paula Corretora"))).toBe(true);
  });
});

describe("isReservedSlug", () => {
  it("blocks the app words", () => {
    expect(isReservedSlug("admin")).toBe(true);
    expect(isReservedSlug("maria-souza")).toBe(false);
  });
});
