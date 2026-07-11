import { describe, expect, it } from "vitest";
import type { AgentRuntimeEvent } from "./agent-events";
import {
  buildAnimatedCursorFallback,
  buildDemoCursorFallback,
  getAgentCursorForFrame,
} from "./agent-cursor";

function event(
  id: string,
  cursor: number,
  x: number,
  y: number,
  personaId = "casey",
): AgentRuntimeEvent {
  return {
    id,
    sessionId: "session-casey",
    personaId,
    cursor,
    step: cursor,
    createdAt: `2026-07-11T22:00:0${cursor}.000Z`,
    type: "narration",
    text: "Thinking aloud",
    x,
    y,
  };
}

describe("agent cursor replay", () => {
  it("uses the latest reported cursor at or before the active evidence frame", () => {
    expect(getAgentCursorForFrame({
      events: [
        event("first", 2, 20, 30),
        event("latest", 3, 45, 55),
        event("future", 6, 80, 90),
      ],
      personaId: "casey",
      frameCursor: 4,
      fallback: null,
    })).toEqual({ x: 45, y: 55, eventId: "latest", source: "agent" });
  });

  it("labels a vision-localized element separately from an H-reported cursor", () => {
    const visionEvent = {
      ...event("vision", 4, 61, 73),
      coordinateSource: "vision" as const,
    };

    expect(getAgentCursorForFrame({
      events: [visionEvent],
      personaId: "casey",
      frameCursor: 4,
      fallback: null,
    })).toEqual({ x: 61, y: 73, eventId: "vision", source: "vision" });
  });

  it("labels a heatmap position as estimated when old evidence has no cursor data", () => {
    expect(getAgentCursorForFrame({
      events: [],
      personaId: "casey",
      frameCursor: 12,
      fallback: { id: "hotspot-1", x: 65, y: 42 },
    })).toEqual({ x: 65, y: 42, eventId: "hotspot-1", source: "evidence" });
  });

  it("renders no cursor when neither reported nor valid fallback evidence exists", () => {
    expect(getAgentCursorForFrame({
      events: [event("invalid", 2, 120, -4)],
      personaId: "casey",
      frameCursor: 4,
      fallback: null,
    })).toBeNull();
  });

  it("builds a bounded moving fallback path for legacy demo replays", () => {
    const first = buildDemoCursorFallback(0, 10);
    const middle = buildDemoCursorFallback(5, 10);

    expect(first).not.toEqual(middle);
    expect([first, middle]).toEqual([
      expect.objectContaining({ id: "demo-cursor-0", x: expect.any(Number), y: expect.any(Number) }),
      expect.objectContaining({ id: "demo-cursor-5", x: expect.any(Number), y: expect.any(Number) }),
    ]);
    for (const point of [first, middle]) {
      expect(point.x).toBeGreaterThanOrEqual(12);
      expect(point.x).toBeLessThanOrEqual(88);
      expect(point.y).toBeGreaterThanOrEqual(16);
      expect(point.y).toBeLessThanOrEqual(82);
    }
  });

  it("keeps an estimated live cursor moving between H screenshot updates", () => {
    const points = Array.from({ length: 12 }, (_, tick) =>
      buildAnimatedCursorFallback(5, 6, tick),
    );

    expect(new Set(points.map(({ x, y }) => `${x}:${y}`)).size).toBeGreaterThan(8);
    for (const point of points) {
      expect(point.id).toContain("live-cursor-5-");
      expect(point.x).toBeGreaterThanOrEqual(8);
      expect(point.x).toBeLessThanOrEqual(92);
      expect(point.y).toBeGreaterThanOrEqual(10);
      expect(point.y).toBeLessThanOrEqual(88);
    }
  });
});
