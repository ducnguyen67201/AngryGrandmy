import { describe, expect, it } from "vitest";
import { selectImprovementCandidate } from "./improvement-handoff";
import type { NormalizedSession } from "@/lib/schemas/run";

function session(
  personaId: string,
  severity: 1 | 2 | 3 | 4 | 5,
  recovered = false,
): NormalizedSession {
  return {
    sessionId: `session-${personaId}`,
    personaId,
    status: "completed",
    visualState: "done",
    eventCursor: 0,
    stepCount: 4,
    startedAt: null,
    finishedAt: null,
    agentViewUrl: null,
    outcome: "success",
    latestActionLabel: null,
    errorCode: null,
    finding: {
      completion: "success",
      summary: "Finished with friction.",
      evidence: [],
      safeStopReached: true,
      frictionEvents: [{
        step: severity,
        category: "clarity",
        severity,
        observation: `${personaId} was confused.`,
        visibleEvidence: "The control was unclear.",
        recommendation: `Improve the control for ${personaId}.`,
        narratedObservation: "This is confusing.",
        recovered,
      }],
    },
  };
}

describe("improvement handoff", () => {
  it("selects the highest-severity finding across completed testers", () => {
    const candidate = selectImprovementCandidate([
      session("linda", 3),
      session("sam", 5),
      session("mei", 4),
    ]);

    expect(candidate).toMatchObject({
      personaId: "sam",
      sessionId: "session-sam",
      friction: {
        severity: 5,
        recommendation: "Improve the control for sam.",
      },
    });
  });

  it("prioritizes an unresolved finding when severity is tied", () => {
    const candidate = selectImprovementCandidate([
      session("recovered", 4, true),
      session("blocked", 4, false),
    ]);

    expect(candidate?.personaId).toBe("blocked");
  });

  it("returns null when there is no actionable friction evidence", () => {
    expect(selectImprovementCandidate([])).toBeNull();
  });
});
