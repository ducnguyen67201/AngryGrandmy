import { describe, expect, it } from "vitest";
import { createDemoRun } from "@/lib/fixtures/demo-run";
import { getPanelFeedback } from "./panel-feedback";

describe("panel feedback", () => {
  it("makes the generated persona panel obvious before dispatch", () => {
    const snapshot = {
      ...createDemoRun(),
      phase: "revealing" as const,
      sessions: [],
      report: null,
    };

    const feedback = getPanelFeedback({
      snapshot,
      loading: false,
      dispatching: false,
    });

    expect(feedback.tone).toBe("ready");
    expect(feedback.title).toBe("Panel ready");
    expect(feedback.description).toContain("Review the 4 generated personas");
    expect(feedback.personaNames).toEqual(["Linda", "Rosa", "Mei", "Joan"]);
    expect(feedback.dispatchLabel).toBe("Dispatch 4 Grandmas");
  });

  it("shows an active planning state while generation is running", () => {
    const feedback = getPanelFeedback({
      snapshot: createDemoRun(),
      loading: true,
      dispatching: false,
    });

    expect(feedback.tone).toBe("planning");
    expect(feedback.title).toBe("Generating panel");
    expect(feedback.dispatchLabel).toBe("Wait for panel");
  });
});
