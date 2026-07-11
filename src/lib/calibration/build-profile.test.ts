import { describe, expect, it } from "vitest";
import { buildCalibrationProfile } from "./build-profile";

describe("buildCalibrationProfile", () => {
  it("turns timestamped observations into evidence-backed behavior rules", () => {
    const profile = buildCalibrationProfile({
      testerName: "Margaret",
      observationNotes:
        "I paused at the unlabeled cart icon, went back, and worried the button would place the order.",
      transcript:
        "Where is my cart? I am going back. Will this place the order?",
      observations: [
        {
          startMs: 4200,
          endMs: 8100,
          type: "hesitation",
          observation: "Pointer remained near an unlabeled cart icon.",
          confidence: 0.91,
        },
        {
          startMs: 12000,
          endMs: 13500,
          type: "backtrack",
          observation: "Tester returned to the product page.",
          confidence: 0.86,
        },
      ],
    });

    expect(profile.evidence).toHaveLength(2);
    expect(profile.behaviorRules.join(" ")).toMatch(/pause|label/i);
    expect(profile.behaviorRules.join(" ")).toMatch(/back|previous/i);
    expect(profile.trustBoundaries.join(" ")).toMatch(/order|confirm/i);
  });

  it("produces a conservative reviewable fallback without model evidence", () => {
    const profile = buildCalibrationProfile({
      testerName: "Tester",
      observationNotes: "The tester reads each label before choosing a control.",
      transcript: null,
      observations: [],
    });

    expect(profile.behaviorRules.length).toBeGreaterThan(0);
    expect(profile.evidence).toEqual([]);
    expect(profile.disclosure).toMatch(/behavioral proxy/i);
  });
});
