import {
  ReclassificationFacts,
  suggestionFromAi,
  suggestionWithoutHistory,
} from "./reclassification-rule.helper";

const facts = (
  overrides: Partial<ReclassificationFacts> = {},
): ReclassificationFacts => ({
  customerId: "customer",
  currentKanbanId: "first-stage",
  hasOpenDeal: false,
  hasUpcomingVisit: false,
  daysSinceContact: 10,
  daysSinceCreated: 30,
  ...overrides,
});

const stageIds = new Set(["first-stage", "second-stage"]);

describe("suggestionFromAi", () => {
  it("moves to a known stage", () => {
    const suggestion = suggestionFromAi(
      facts(),
      {
        action: "move",
        stageId: "second-stage",
        confidence: "high",
        reason: "Pediu visita",
      },
      stageIds,
    );
    expect(suggestion.action).toBe("move");
    expect(suggestion.kanbanId).toBe("second-stage");
    expect(suggestion.reason).toBe("Pediu visita");
  });

  it("keeps when the stage is unknown or the same", () => {
    expect(
      suggestionFromAi(
        facts(),
        { action: "move", stageId: "made-up" },
        stageIds,
      ).action,
    ).toBe("keep");
    const same = suggestionFromAi(
      facts(),
      { action: "move", stageId: "first-stage" },
      stageIds,
    );
    expect(same.action).toBe("keep");
    expect(same.kanbanId).toBe("first-stage");
  });

  it("never loses or deletes a customer with an open deal or a visit ahead", () => {
    for (const protectedFacts of [
      facts({ hasOpenDeal: true }),
      facts({ hasUpcomingVisit: true }),
    ]) {
      for (const action of ["lost", "delete"]) {
        const suggestion = suggestionFromAi(
          protectedFacts,
          { action, confidence: "high" },
          stageIds,
        );
        expect(suggestion.action).toBe("keep");
        expect(suggestion.kanbanId).toBe("first-stage");
      }
    }
  });

  it("turns an unsure delete into lost", () => {
    const suggestion = suggestionFromAi(
      facts(),
      { action: "delete", confidence: "low" },
      stageIds,
    );
    expect(suggestion.action).toBe("lost");
    expect(suggestion.kanbanId).toBeNull();
  });

  it("falls back to keep and the warmth by days on bad answers", () => {
    const suggestion = suggestionFromAi(
      facts({ daysSinceContact: 40 }),
      { action: "explode", temperature: "boiling", confidence: "sure" },
      stageIds,
    );
    expect(suggestion.action).toBe("keep");
    expect(suggestion.confidence).toBe("low");
    expect(suggestion.temperature).toBe("cold");
  });
});

describe("suggestionWithoutHistory", () => {
  it("suggests lost for a customer abandoned for a long time", () => {
    const suggestion = suggestionWithoutHistory(
      facts({ daysSinceCreated: 90, daysSinceContact: 90 }),
    );
    expect(suggestion.action).toBe("lost");
    expect(suggestion.analyzed).toBe(false);
  });

  it("keeps a recent customer", () => {
    const suggestion = suggestionWithoutHistory(facts({ daysSinceCreated: 5 }));
    expect(suggestion.action).toBe("keep");
    expect(suggestion.kanbanId).toBe("first-stage");
  });
});
