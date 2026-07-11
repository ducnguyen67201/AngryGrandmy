import { describe, expect, it } from "vitest";
import { getHeatmapDisplay } from "./heatmap-display";

describe("heatmap display copy", () => {
  it("points users to the visible live heatmap markers", () => {
    const display = getHeatmapDisplay({
      hotspotCount: 7,
      heatmapLine: "NVIDIA-localized heatmap (Nemotron).",
      liveMode: false,
    });

    expect(display.label).toBe("Live heatmap");
    expect(display.countLabel).toBe("7 hotspots");
    expect(display.hint).toContain("glowing numbered markers");
    expect(display.sourceLabel).toContain("NVIDIA");
  });

  it("explains that heatmap is waiting for evidence", () => {
    const display = getHeatmapDisplay({
      hotspotCount: 0,
      heatmapLine: "Heatmap will localize once friction evidence exists.",
      liveMode: true,
    });

    expect(display.countLabel).toBe("Waiting for evidence");
    expect(display.hint).toContain("H sessions finish");
  });
});
