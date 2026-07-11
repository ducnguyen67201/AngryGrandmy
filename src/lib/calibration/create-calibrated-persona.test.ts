import { describe, expect, it } from "vitest";
import { createCalibratedPersona } from "./create-calibrated-persona";
import type { CalibrationSession } from "./calibration";

function approvedSession(): CalibrationSession {
  const now = new Date().toISOString();
  return {
    id: "cal-margaret",
    testerName: "Margaret",
    targetUrl: "https://example.com",
    objective: "Reach checkout review.",
    consentedAt: now,
    status: "approved",
    source: "nvidia",
    transcript: "Where is my cart?",
    media: null,
    evidence: [
      {
        startMs: 1000,
        endMs: 3000,
        type: "hesitation",
        observation: "Paused at an icon-only cart control.",
        transcript: "Where is my cart?",
        confidence: 0.9,
      },
    ],
    behaviorRules: ["Pause at icon-only controls and look for a text label."],
    trustBoundaries: ["Stop before placing an order."],
    approvedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

describe("createCalibratedPersona", () => {
  it("maps an approved profile into a safe H-ready persona", () => {
    const persona = createCalibratedPersona(approvedSession());

    expect(persona.id).toBe("calibrated-cal-margaret");
    expect(persona.behaviors[0]).toMatch(/icon-only/i);
    expect(persona.dispatchInstruction).toMatch(/observable/i);
    expect(persona.dispatchInstruction).toMatch(/do not impersonate/i);
    expect(persona.stopConditions).toContain("Stop before placing an order.");
  });

  it("refuses to dispatch an unapproved profile", () => {
    expect(() =>
      createCalibratedPersona({
        ...approvedSession(),
        status: "needs_review",
        approvedAt: null,
      }),
    ).toThrow(/approved/i);
  });
});
