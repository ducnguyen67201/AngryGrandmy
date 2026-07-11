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

  it("falls back to safe deterministic coordinates when reported positions are invalid", () => {
    const hotspots = buildLiveVisualHotspots([
      {
        id: "friction-2",
        personaId: "unknown-persona",
        step: 1,
        category: "navigation",
        severity: 2,
        observation: "The navigation is unclear.",
        visibleEvidence: "Several identical icons are visible.",
        recommendation: "Label the navigation icons.",
        x: 140,
        y: Number.NaN,
      },
    ], null);

    expect(hotspots[0]).toMatchObject({
      personaName: "unknown-persona",
      x: 28,
      y: 28,
    });
  });
});
