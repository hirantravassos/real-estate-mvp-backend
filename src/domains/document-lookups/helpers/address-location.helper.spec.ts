import {
  locationFromAddress,
  stateAbbreviationOf,
} from "./address-location.helper";

describe("locationFromAddress", () => {
  it("reads the city and state the address field saves", () => {
    expect(
      locationFromAddress(
        "11060-001 Rua Azevedo Sodré, Gonzaga, Santos - São Paulo",
      ),
    ).toEqual({ city: "Santos", state: "SP" });
  });

  it("reads a typed city with the state abbreviation", () => {
    expect(
      locationFromAddress("Av. Atlântica, 100, Rio de Janeiro/RJ"),
    ).toEqual({ city: "Rio de Janeiro", state: "RJ" });
  });

  it("gives up when there is no state at the end", () => {
    expect(locationFromAddress("Rua das Flores, 120")).toBeNull();
    expect(locationFromAddress("")).toBeNull();
  });
});

describe("stateAbbreviationOf", () => {
  it("knows names without accents and abbreviations", () => {
    expect(stateAbbreviationOf("Paraná")).toBe("PR");
    expect(stateAbbreviationOf("mg")).toBe("MG");
    expect(stateAbbreviationOf("Buenos Aires")).toBeNull();
  });
});
