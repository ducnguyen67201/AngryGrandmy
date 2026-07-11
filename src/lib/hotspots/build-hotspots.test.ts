import { describe, expect, it } from "vitest";
import { demoAnalysis, demoSessions } from "@/lib/fixtures/demo-run";
import {
  buildVisualHotspots,
  summarizeHotspots,
} from "./build-hotspots";
import { buildLiveVisualHotspots } from "./build-live-hotspots";

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

  it("turns live frustration signals into heatmap hotspots before completion", () => {
    const hotspots = buildLiveVisualHotspots(
      [
        {
          id: "event-1",
          personaId: "joan",
          step: 3,
          category: "clarity",
          severity: 4,
          observation: "The primary action is ambiguous.",
          visibleEvidence: "Two equally prominent buttons are visible.",
          recommendation: "Use one clear primary action.",
        },
      ],
      demoAnalysis,
    );

    expect(hotspots).toEqual([
      expect.objectContaining({
        id: "event-1",
        personaId: "joan",
        personaName: "Joan",
        severity: 4,
        x: expect.any(Number),
        y: expect.any(Number),
      }),
    ]);
  });

  it("uses safe labels when live persona metadata or evidence is unavailable", () => {
    const hotspots = buildLiveVisualHotspots(
      [
        {
          id: "event-unknown",
          personaId: "custom-persona",
          step: 0,
          category: "technical",
          severity: 2,
          observation: "The page did not respond.",
          visibleEvidence: "",
          recommendation: "Show a recovery action.",
        },
      ],
      null,
    );

    expect(hotspots[0]).toEqual(
      expect.objectContaining({
        personaName: "custom-persona",
        evidence: "The page did not respond.",
      }),
    );
  });
});
