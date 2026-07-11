import { describe, expect, it } from "vitest";
import { createDemoRun } from "@/lib/fixtures/demo-run";
import { getRunGuidance } from "@/lib/ui/run-guidance";

describe("getRunGuidance", () => {
  it("directs a new run to the website input", () => {
    const snapshot = {
      ...createDemoRun(),
      phase: "idle" as const,
      analysis: null,
      sessions: [],
      report: null,
    };

    const guidance = getRunGuidance({ snapshot, loading: false, dispatching: false });

    expect(guidance.activeStep).toBe("website");
    expect(guidance.nextAction.title).toBe("Add the website and objective");
  });

  it("moves from generated persona tasks to agent dispatch", () => {
    const snapshot = {
      ...createDemoRun(),
      phase: "revealing" as const,
      sessions: [],
      report: null,
    };

    const guidance = getRunGuidance({ snapshot, loading: false, dispatching: false });

    expect(guidance.activeStep).toBe("dispatch");
    expect(guidance.steps.find((step) => step.id === "personas")?.status).toBe("complete");
    expect(guidance.nextAction.title).toBe("Review tasks, then dispatch the panel");
  });

  it("recommends fixing the weakest dimension before rerunning", () => {
    const guidance = getRunGuidance({
      snapshot: createDemoRun(),
      loading: false,
      dispatching: false,
    });

    expect(guidance.activeStep).toBe("decision");
    expect(guidance.nextAction.title).toBe("Fix the top blocker, then rerun");
    expect(guidance.nextAction.detail).toContain("Recovery");
    expect(guidance.nextAction.recommendation).toBe(
      "Add a visible 'Choose this appointment' label next to the calendar icon.",
    );
  });

  it("expands coverage after a strong score", () => {
    const snapshot = createDemoRun();
    snapshot.report = {
      ...snapshot.report!,
      score: 88,
      dimensions: {
        completion: 38,
        efficiency: 18,
        clarity: 13,
        recovery: 12,
        trust: 9,
      },
    };

    const guidance = getRunGuidance({ snapshot, loading: false, dispatching: false });

    expect(guidance.nextAction.title).toBe("Expand coverage");
    expect(guidance.nextAction.detail).toContain("88/100");
  });
});
