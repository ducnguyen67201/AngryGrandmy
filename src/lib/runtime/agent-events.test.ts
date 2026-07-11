import { describe, expect, it } from "vitest";
import {
  getPersonaViewportFrames,
  mergeAgentRuntimeEvents,
  type AgentRuntimeEvent,
} from "./agent-events";

function event(
  id: string,
  cursor: number,
  type: AgentRuntimeEvent["type"] = "viewport",
): AgentRuntimeEvent {
  return {
    id,
    sessionId: "session-1",
    personaId: "linda",
    cursor,
    step: cursor,
    createdAt: `2026-07-11T20:00:${String(cursor).padStart(2, "0")}.000Z`,
    type,
    ...(type === "viewport" ? { imageUrl: `data:image/png;base64,${id}` } : {}),
  };
}

describe("agent event timeline", () => {
  it("keeps prior viewport frames so a completed run can be replayed", () => {
    const merged = mergeAgentRuntimeEvents(
      [event("frame-1", 1)],
      [event("frame-2", 2), event("thought-2", 2, "narration")],
    );

    expect(getPersonaViewportFrames(merged, "linda").map((item) => item.id)).toEqual([
      "frame-1",
      "frame-2",
    ]);
  });

  it("deduplicates events returned again by provider polling", () => {
    const frame = event("frame-1", 1);
    expect(mergeAgentRuntimeEvents([frame], [frame])).toEqual([frame]);
  });
});
