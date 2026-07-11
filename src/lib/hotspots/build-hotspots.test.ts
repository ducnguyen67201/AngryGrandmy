import { describe, expect, it } from "vitest";
import { demoAnalysis, demoSessions } from "@/lib/fixtures/demo-run";
import { buildVisualHotspots, summarizeHotspots } from "./build-hotspots";

describe("buildVisualHotspots", () => {
  it("turns friction events into bounded visual hotspots", () => {
    const hotspots = buildVisualHotspots(demoSessions, demoAnalysis);

    expect(hotspots.length).toBeGreaterThan(0);
    expect(hotspots[0]).toMatchObject({
      personaId: "linda",
      personaName: "Linda",
      category: "clarity",
    });
    expect(hotspots.every((hotspot) => hotspot.x >= 0 && hotspot.x <= 100)).toBe(true);
    expect(hotspots.every((hotspot) => hotspot.y >= 0 && hotspot.y <= 100)).toBe(true);
  });

  it("summarizes hotspot categories", () => {
    const summary = summarizeHotspots(buildVisualHotspots(demoSessions, demoAnalysis));

    expect(summary.clarity).toBeGreaterThan(0);
    expect(summary.navigation).toBeGreaterThan(0);
    expect(summary.trust).toBeGreaterThan(0);
  });
});
