import { publicRegion } from "./public-region.helper";

describe("publicRegion", () => {
  it("keeps district and city of autocompleted addresses", () => {
    expect(
      publicRegion("80000-000 Rua das Flores, Centro, Curitiba - PR"),
    ).toBe("Centro, Curitiba - PR");
  });

  it("drops the number written after the street", () => {
    expect(publicRegion("Rua A, 12 - Centro, Curitiba - PR")).toBe(
      "Centro, Curitiba - PR",
    );
    expect(publicRegion("Rua A, 12, Batel, Curitiba")).toBe("Batel, Curitiba");
  });

  it("returns null when only the street is known", () => {
    expect(publicRegion("Rua A, 12")).toBeNull();
    expect(publicRegion("Rua A")).toBeNull();
  });
});
