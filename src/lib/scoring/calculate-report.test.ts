import { describe, expect, it } from "vitest";
import { demoAnalysis, demoSessions } from "@/lib/fixtures/demo-run";
import { calculateUsabilityReport } from "@/lib/scoring/calculate-report";
import type { NormalizedSession } from "@/lib/schemas/run";

const expectedBudgets = Object.fromEntries(
  demoAnalysis.personas.map((persona) => [
    persona.id,
    persona.expectedStepBudget,
  ]),
);

describe("calculateUsabilityReport", () => {
  it("calculates deterministic score dimensions from persona evidence", () => {
    const report = calculateUsabilityReport(demoSessions, expectedBudgets);

    expect(report.score).toBe(65);
    expect(report.dimensions).toEqual({
      completion: 25,
      efficiency: 15.9,
      clarity: 11,
      recovery: 5,
      trust: 8,
    });
    expect(report.completedCount).toBe(2);
    expect(report.topRecommendations[0]).toBe(
      "Add a visible 'Choose this appointment' label next to the calendar icon.",
    );
  });

  it("excludes provider failures from product usability scoring", () => {
    const providerFailure: NormalizedSession = {
      ...demoSessions[0],
      sessionId: "provider-failed",
      personaId: "failed-provider",
      errorCode: "provider_failure",
      finding: null,
      status: "failed",
      outcome: "unknown",
      visualState: "failed",
    };

    const reportWithoutFailure = calculateUsabilityReport(
      demoSessions,
      expectedBudgets,
    );
    const reportWithFailure = calculateUsabilityReport(
      [...demoSessions, providerFailure],
      expectedBudgets,
    );

    expect(reportWithFailure.score).toBe(reportWithoutFailure.score);
    expect(reportWithFailure.completedCount).toBe(
      reportWithoutFailure.completedCount,
    );
  });

  it("clusters repeated visible evidence into shared hotspots", () => {
    const report = calculateUsabilityReport(demoSessions, expectedBudgets);

    expect(report.sharedHotspots.length).toBeGreaterThan(0);
    expect(report.sharedHotspots[0]).toMatchObject({
      category: "navigation",
      maxSeverity: 5,
    });
  });
});
