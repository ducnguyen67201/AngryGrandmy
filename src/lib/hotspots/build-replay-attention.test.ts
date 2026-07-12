import { describe, expect, it } from "vitest";

import {
  buildReplayAttentionHotspots,
  filterReplayHotspotsForFrame,
} from "./build-replay-attention";
import type { AgentRuntimeEvent } from "@/lib/runtime/agent-events";

function event(overrides: Partial<AgentRuntimeEvent>): AgentRuntimeEvent {
  return {
    id: "event-1",
    sessionId: "session-1",
    personaId: "arjun",
    cursor: 1,
    step: 1,
    createdAt: "2026-07-11T22:00:00.000Z",
    type: "narration",
    text: "I am looking for the next action.",
    x: 42,
    y: 58,
    coordinateSource: "vision",
    ...overrides,
  };
}

describe("buildReplayAttentionHotspots", () => {
  it("returns no replay heat when no persona is selected", () => {
    expect(buildReplayAttentionHotspots([
      event({ id: "visible", cursor: 1 }),
    ], undefined, null, 1)).toEqual([]);
  });

  it("reveals attention points only for the active replay frame window", () => {
    const events = [
      event({ id: "early", cursor: 2, x: 20, y: 30 }),
      event({ id: "current", cursor: 5, x: 60, y: 70 }),
      event({ id: "future", cursor: 9, x: 80, y: 20 }),
      event({ id: "other", personaId: "miles", cursor: 3 }),
    ];

    expect(buildReplayAttentionHotspots(events, "arjun", 2, 5).map(({ id }) => id))
      .toEqual(["attention-current"]);
  });

  it("includes first-frame evidence when there is no previous replay cursor", () => {
    const events = [
      event({ id: "first", cursor: 1, x: 20, y: 30 }),
      event({ id: "later", cursor: 5, x: 60, y: 70 }),
    ];

    expect(buildReplayAttentionHotspots(events, "arjun", null, 1).map(({ id }) => id))
      .toEqual(["attention-first"]);
  });

  it("makes frustration hotter than ordinary visual attention", () => {
    const hotspots = buildReplayAttentionHotspots([
      event({ id: "looking", emotion: "neutral" }),
      event({
        id: "blocked",
        type: "frustration",
        category: "clarity",
        severity: 5,
        observation: "This control is unclear.",
      }),
    ], "arjun", null, 10);

    expect(hotspots.find(({ id }) => id === "attention-blocked")?.severity)
      .toBeGreaterThan(hotspots.find(({ id }) => id === "attention-looking")?.severity ?? 0);
  });

  it("uses defaults for sparse frustration and narration events", () => {
    const hotspots = buildReplayAttentionHotspots([
      event({
        id: "sparse-frustration",
        type: "frustration",
        severity: undefined,
        observation: undefined,
        text: undefined,
        recommendation: undefined,
      }),
      event({ id: "frustrated", cursor: 2, emotion: "frustrated" }),
      event({ id: "uncertain", cursor: 3, emotion: "uncertain" }),
      event({ id: "relieved", cursor: 4, emotion: "relieved" }),
    ], "arjun", null, 4);

    expect(hotspots.find(({ id }) => id === "attention-sparse-frustration"))
      .toMatchObject({
        severity: 4,
        evidence: "Observed this interface element.",
        recommendation: "Review this high-attention interface area.",
      });
    expect(hotspots.find(({ id }) => id === "attention-frustrated")?.severity)
      .toBe(4);
    expect(hotspots.find(({ id }) => id === "attention-uncertain")?.severity)
      .toBe(3);
    expect(hotspots.find(({ id }) => id === "attention-relieved")?.severity)
      .toBe(1);
  });

  it("ignores events without valid screenshot coordinates", () => {
    expect(buildReplayAttentionHotspots([
      event({ id: "missing", x: undefined, y: undefined }),
      event({ id: "invalid", x: 130, y: -4 }),
    ], "arjun", null, 10)).toEqual([]);
  });
});

describe("filterReplayHotspotsForFrame", () => {
  const hotspot = (id: string, step: number) => ({
    id,
    personaId: "arjun",
    personaName: "Arjun",
    category: "clarity" as const,
    severity: 3 as const,
    x: 40 + step,
    y: 50,
    label: "clarity",
    evidence: `Step ${step}`,
    recommendation: "Clarify this area.",
    step,
  });

  it("shows final finding hotspots only for the active replay step window", () => {
    const hotspots = [
      hotspot("early", 2),
      hotspot("current", 5),
      hotspot("future", 9),
    ];

    expect(filterReplayHotspotsForFrame({
      hotspots,
      previousStep: 2,
      currentStep: 5,
    }).map(({ id }) => id)).toEqual(["current"]);
  });

  it("includes first-frame finding hotspots when replay starts", () => {
    expect(filterReplayHotspotsForFrame({
      hotspots: [hotspot("first", 1), hotspot("later", 4)],
      previousStep: null,
      currentStep: 1,
    }).map(({ id }) => id)).toEqual(["first"]);
  });
});
