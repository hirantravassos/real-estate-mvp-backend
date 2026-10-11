import { PropertyKindEnum } from "../../properties/mappers/property.mapper";
import { HuntCriteria } from "../types/hunt-criteria.type";
import {
  MatchFacts,
  MINIMUM_MATCH_SCORE,
  scoreMatch,
} from "./match-score.helper";

/** 3 quartos, suíte, vaga, condomínio até 500, academia, 500 m da praia, até 800 mil, Embaré. */
const embareCriteria: HuntCriteria = {
  transaction: "sale",
  kind: PropertyKindEnum.APARTMENT,
  state: "SP",
  city: "Santos",
  neighborhoods: ["Embaré"],
  minimumPrice: null,
  maximumPrice: 800000,
  minimumBedrooms: 3,
  minimumSuites: 1,
  minimumBathrooms: null,
  minimumParkingSpaces: 1,
  minimumArea: null,
  maximumArea: null,
  maximumMaintenanceFee: 500,
  maximumBeachDistanceMeters: 500,
  amenities: ["gym"],
  extraWishes: [],
};

const perfectFacts: MatchFacts = {
  kind: PropertyKindEnum.APARTMENT,
  transaction: "sale",
  price: 780000,
  maintenanceFee: 480,
  location: "Rua Carvalho de Mendonça, Embare, Santos, SP",
  bedrooms: 3,
  suites: 1,
  bathrooms: 2,
  parkingSpaces: 1,
  area: 98,
  beachDistanceMeters: 350,
  beachDistanceEstimated: false,
  amenities: ["gym", "pool"],
};

describe("scoreMatch", () => {
  it("gives a perfect listing the top score and explains why", () => {
    const result = scoreMatch(perfectFacts, embareCriteria);
    expect(result.score).toBe(100);
    expect(result.warnings).toEqual([]);
    expect(result.highlights).toEqual(
      expect.arrayContaining([
        "No Embaré",
        "3 quartos",
        "1 suíte",
        "Tem academia",
        "350 m da praia",
      ]),
    );
  });

  it("finds the neighborhood without accents", () => {
    const result = scoreMatch(
      { ...perfectFacts, location: "EMBARÉ - SANTOS" },
      embareCriteria,
    );
    expect(result.highlights).toContain("No Embaré");
  });

  it("keeps a listing that hides details, flagged to confirm", () => {
    const result = scoreMatch(
      {
        ...perfectFacts,
        maintenanceFee: null,
        beachDistanceMeters: null,
        amenities: null,
      },
      embareCriteria,
    );
    expect(result.score).toBeGreaterThanOrEqual(MINIMUM_MATCH_SCORE);
    expect(result.score).toBeLessThan(100);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        "Não informa o condomínio",
        "Confirmar academia",
      ]),
    );
  });

  it("holds back a listing missing a hard requirement", () => {
    const result = scoreMatch({ ...perfectFacts, bedrooms: 2 }, embareCriteria);
    expect(result.score).toBeLessThanOrEqual(45);
    expect(result.warnings[0]).toContain("2 quartos");
  });

  it("holds back a listing far over the budget", () => {
    const result = scoreMatch(
      { ...perfectFacts, price: 1_100_000 },
      embareCriteria,
    );
    expect(result.score).toBeLessThanOrEqual(45);
  });

  it("tolerates a price a little over the budget", () => {
    const result = scoreMatch(
      { ...perfectFacts, price: 830000 },
      embareCriteria,
    );
    expect(result.score).toBeGreaterThan(80);
    expect(result.warnings[0]).toContain("Um pouco acima");
  });

  it("drops listings for rent when the customer wants to buy", () => {
    const result = scoreMatch(
      { ...perfectFacts, transaction: "rent", price: 4500 },
      embareCriteria,
    );
    expect(result.score).toBeLessThan(MINIMUM_MATCH_SCORE);
  });

  it("marks an estimated beach distance", () => {
    const result = scoreMatch(
      { ...perfectFacts, beachDistanceEstimated: true },
      embareCriteria,
    );
    expect(result.highlights).toContain("350 m da praia (estimado)");
  });
});
