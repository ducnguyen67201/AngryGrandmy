import { describe, expect, it } from "vitest";
import { getLiveViewportPresentation } from "./live-viewport";

describe("live viewport presentation", () => {
  it("keeps heatmap hotspots visible over a real H browser frame", () => {
    expect(
      getLiveViewportPresentation({
        hasLiveViewport: true,
        hotspotCount: 3,
      }),
    ).toEqual({
      showSyntheticScaffold: false,
      showHotspotOverlay: true,
    });
  });

  it("does not render an empty hotspot overlay", () => {
    expect(
      getLiveViewportPresentation({
        hasLiveViewport: true,
        hotspotCount: 0,
      }).showHotspotOverlay,
    ).toBe(false);
  });
});
