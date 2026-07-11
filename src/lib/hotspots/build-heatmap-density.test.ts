import { describe, expect, it } from "vitest";

import { buildHeatmapDensityBlobs } from "@/lib/hotspots/build-heatmap-density";
import type { VisualHotspot } from "@/lib/hotspots/build-hotspots";

function hotspot(overrides: Partial<VisualHotspot> = {}): VisualHotspot {
  return {
    id: "signal-1",
    personaId: "persona-1",
    personaName: "Linda",
    category: "clarity",
    severity: 3,
    x: 50,
    y: 40,
    label: "clarity",
    evidence: "The next step is unclear.",
    recommendation: "Label the primary action.",
    ...overrides,
  };
}

describe("buildHeatmapDensityBlobs", () => {
  it("maps stronger friction to a larger and more opaque density field", () => {
    const [mild, severe] = buildHeatmapDensityBlobs([
      hotspot({ id: "mild", severity: 1 }),
      hotspot({ id: "severe", severity: 5 }),
    ]);

    expect(severe.radius).toBeGreaterThan(mild.radius);
    expect(severe.opacity).toBeGreaterThan(mild.opacity);
    expect(severe.coreOpacity).toBeGreaterThan(mild.coreOpacity);
  });

  it("preserves evidence coordinates and clamps malformed provider values", () => {
    const [valid, clamped] = buildHeatmapDensityBlobs([
      hotspot({ id: "valid", x: 17, y: 83 }),
      hotspot({ id: "clamped", x: 140, y: -20 }),
    ]);

    expect(valid).toMatchObject({ id: "valid", x: 17, y: 83 });
    expect(clamped).toMatchObject({ id: "clamped", x: 100, y: 0 });
  });

  it("limits density work while retaining the newest signals", () => {
    const signals = Array.from({ length: 25 }, (_, index) =>
      hotspot({ id: `signal-${index}` }),
    );

    const blobs = buildHeatmapDensityBlobs(signals);

    expect(blobs).toHaveLength(18);
    expect(blobs[0].id).toBe("signal-7");
    expect(blobs.at(-1)?.id).toBe("signal-24");
  });
});
