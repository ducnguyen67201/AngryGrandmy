import { describe, expect, it } from "vitest";
import { calculateBehaviorOverlap } from "./calculate-overlap";

describe("calculateBehaviorOverlap", () => {
  it("scores only observable overlap and reports reproduced evidence", () => {
    const result = calculateBehaviorOverlap(
      [
        { type: "hesitation", observation: "Paused at cart", confidence: 0.9 },
        { type: "backtrack", observation: "Returned once", confidence: 0.8 },
        { type: "trust_concern", observation: "Worried about order", confidence: 0.9 },
      ],
      ["hesitation", "backtrack"],
    );

    expect(result.reproducedCount).toBe(2);
    expect(result.totalObserved).toBe(3);
    expect(result.score).toBe(67);
    expect(result.label).toBe("moderate");
  });

  it("returns insufficient evidence instead of inventing similarity", () => {
    expect(calculateBehaviorOverlap([], ["hesitation"])).toEqual({
      score: null,
      label: "insufficient_evidence",
      reproducedCount: 0,
      totalObserved: 0,
      reproducedTypes: [],
      missedTypes: [],
    });
  });
});
