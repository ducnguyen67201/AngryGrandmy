import { describe, expect, it } from "vitest";

import {
  buildSynchronizedReplayTimeline,
  chunkReplayFrames,
  nextReplayFrameIndex,
} from "./synchronized-replay";
import type { AgentRuntimeEvent } from "@/lib/runtime/agent-events";

function frame(id: string, cursor: number): AgentRuntimeEvent {
  return {
    id,
    sessionId: "session-1",
    personaId: "sam",
    cursor,
    step: cursor,
    createdAt: `2026-07-11T17:00:0${cursor}.000Z`,
    type: "viewport",
    imageUrl: `data:image/png;base64,${id}`,
  };
}

function narration(frameId: string, cursor: number): AgentRuntimeEvent {
  return {
    id: `screen-narration:${frameId}`,
    sessionId: "session-1",
    personaId: "sam",
    cursor,
    step: cursor,
    createdAt: `2026-07-11T17:01:0${cursor}.000Z`,
    type: "narration",
    text: `Narration for ${frameId}`,
    x: 30 + cursor,
    y: 40 + cursor,
    coordinateSource: "vision",
  };
}

describe("buildSynchronizedReplayTimeline", () => {
  it("pairs each captured screen with its narration, audio, and attention point", () => {
    const frames = [frame("frame-1", 1), frame("frame-2", 2)];
    const events = [
      ...frames,
      narration("frame-1", 1),
      narration("frame-2", 2),
    ];

    const timeline = buildSynchronizedReplayTimeline({
      frames,
      events,
      preparedAudioEventIds: new Set([
        "screen-narration:frame-1",
        "screen-narration:frame-2",
      ]),
    });

    expect(timeline.ready).toBe(true);
    expect(timeline.pendingFrameIds).toEqual([]);
    expect(timeline.frames).toEqual([
      expect.objectContaining({
        frameId: "frame-1",
        narrationEventId: "screen-narration:frame-1",
        transcript: "Narration for frame-1",
        x: 31,
        y: 41,
      }),
      expect.objectContaining({
        frameId: "frame-2",
        narrationEventId: "screen-narration:frame-2",
        transcript: "Narration for frame-2",
        x: 32,
        y: 42,
      }),
    ]);
  });

  it("stays unready until every screen has both narration and prepared audio", () => {
    const frames = [frame("frame-1", 1), frame("frame-2", 2)];

    const timeline = buildSynchronizedReplayTimeline({
      frames,
      events: [...frames, narration("frame-1", 1)],
      preparedAudioEventIds: new Set(["screen-narration:frame-1"]),
    });

    expect(timeline.ready).toBe(false);
    expect(timeline.pendingFrameIds).toEqual(["frame-2"]);
  });

  it("does not treat narration without cached audio as replay-ready", () => {
    const frames = [frame("frame-1", 1)];

    const timeline = buildSynchronizedReplayTimeline({
      frames,
      events: [...frames, narration("frame-1", 1)],
      preparedAudioEventIds: new Set(),
    });

    expect(timeline.ready).toBe(false);
    expect(timeline.pendingFrameIds).toEqual(["frame-1"]);
  });
});

describe("nextReplayFrameIndex", () => {
  it("advances after narration and stops on the final frame", () => {
    expect(nextReplayFrameIndex(0, 3)).toBe(1);
    expect(nextReplayFrameIndex(1, 3)).toBe(2);
    expect(nextReplayFrameIndex(2, 3)).toBeNull();
  });
});

describe("chunkReplayFrames", () => {
  it("prepares large completed runs in bounded parallel batches", () => {
    const frames = [
      frame("frame-1", 1),
      frame("frame-2", 2),
      frame("frame-3", 3),
      frame("frame-4", 4),
      frame("frame-5", 5),
    ];

    expect(chunkReplayFrames(frames, 3).map((batch) => batch.map(({ id }) => id)))
      .toEqual([
        ["frame-1", "frame-2", "frame-3"],
        ["frame-4", "frame-5"],
      ]);
  });
});
