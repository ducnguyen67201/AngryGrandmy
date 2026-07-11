import { describe, expect, it } from "vitest";
import { createDemoRun } from "@/lib/fixtures/demo-run";
import {
  evidenceTypesFromSession,
  isUserSuppliedPersona,
  mergeCalibratedPersona,
} from "./lab-integration";
import { createCalibratedPersona } from "./create-calibrated-persona";
import type { CalibrationSession } from "./calibration";

function calibration(): CalibrationSession {
  const now = new Date().toISOString();
  return {
    id: "cal-1",
    testerName: "Margaret",
    targetUrl: "https://example.com",
    objective: "Reach checkout review.",
    consentedAt: now,
    status: "approved",
    source: "heuristic",
    transcript: null,
    media: null,
    evidence: [],
    behaviorRules: ["Pause at icon-only controls."],
    trustBoundaries: ["Stop before purchase."],
    approvedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

describe("calibration lab integration", () => {
  it("adds one approved calibrated persona without exceeding the panel contract", () => {
    const analysis = createDemoRun().analysis!;
    const persona = createCalibratedPersona(calibration());
    const merged = mergeCalibratedPersona(analysis, persona);

    expect(merged.personas).toHaveLength(5);
    expect(merged.personas.at(-1)?.id).toBe("calibrated-cal-1");
    expect(isUserSuppliedPersona(merged.personas.at(-1)!)).toBe(true);
  });

  it("maps final session evidence to observable calibration types", () => {
    const session = createDemoRun().sessions[0];
    const types = evidenceTypesFromSession({
      ...session,
      finding: {
        ...session.finding!,
        completion: "success",
        frictionEvents: [
          { ...session.finding!.frictionEvents[0], category: "trust" },
          { ...session.finding!.frictionEvents[0], category: "recovery" },
          {
            ...session.finding!.frictionEvents[0],
            category: "navigation",
            observation: "The agent went back to the previous page.",
          },
        ],
      },
    });

    expect(types).toEqual(
      expect.arrayContaining(["trust_concern", "recovery", "backtrack", "success"]),
    );
  });
});
