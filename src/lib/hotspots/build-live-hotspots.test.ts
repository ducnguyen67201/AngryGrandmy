import { describe, expect, it } from "vitest";
import { demoAnalysis } from "@/lib/fixtures/demo-run";
import { buildLiveVisualHotspots } from "./build-live-hotspots";

describe("live heatmap hotspots", () => {
  it("uses agent-reported screen coordinates for an immediate live marker", () => {
    const hotspots = buildLiveVisualHotspots([
      {
        id: "friction-1",
        personaId: "linda",
        step: 3,
        category: "clarity",
        severity: 4,
        observation: "The submit icon has no label.",
        visibleEvidence: "An unlabeled icon appears in the top-right corner.",
        recommendation: "Add a visible text label.",
        x: 88,
        y: 17,
      },
    ], demoAnalysis);

    expect(hotspots[0]).toMatchObject({ x: 88, y: 17, severity: 4 });
  });
});
