import type { AgentRuntimeEvent } from "@/lib/runtime/agent-events";

export type SynchronizedReplayFrame = {
  frameId: string;
  frameIndex: number;
  cursor: number;
  narrationEventId: string;
  transcript: string;
  x: number;
  y: number;
};

export type SynchronizedReplayTimeline = {
  ready: boolean;
  frames: SynchronizedReplayFrame[];
  pendingFrameIds: string[];
};

export function buildSynchronizedReplayTimeline({
  frames,
  events,
  preparedAudioEventIds,
}: {
  frames: readonly AgentRuntimeEvent[];
  events: readonly AgentRuntimeEvent[];
  preparedAudioEventIds: ReadonlySet<string>;
}): SynchronizedReplayTimeline {
  const narrationById = new Map(
    events
      .filter((event) => event.type === "narration")
      .map((event) => [event.id, event]),
  );
  const prepared: SynchronizedReplayFrame[] = [];
  const pendingFrameIds: string[] = [];

  frames.forEach((frame, frameIndex) => {
    const narrationEventId = narrationEventIdForFrame(frame.id);
    const narration = narrationById.get(narrationEventId);
    if (
      !narration?.text?.trim() ||
      !validPercent(narration.x) ||
      !validPercent(narration.y) ||
      !preparedAudioEventIds.has(narrationEventId)
    ) {
      pendingFrameIds.push(frame.id);
      return;
    }

    prepared.push({
      frameId: frame.id,
      frameIndex,
      cursor: frame.cursor,
      narrationEventId,
      transcript: narration.text.trim(),
      x: narration.x,
      y: narration.y,
    });
  });

  return {
    ready: frames.length > 0 && pendingFrameIds.length === 0,
    frames: prepared,
    pendingFrameIds,
  };
}

export function narrationEventIdForFrame(frameId: string) {
  return `screen-narration:${frameId}`;
}

export function nextReplayFrameIndex(
  currentIndex: number,
  frameCount: number,
): number | null {
  const next = currentIndex + 1;
  return next < frameCount ? next : null;
}

export function chunkReplayFrames<T>(
  frames: readonly T[],
  batchSize: number,
): T[][] {
  const size = Math.max(1, Math.floor(batchSize));
  const batches: T[][] = [];
  for (let index = 0; index < frames.length; index += size) {
    batches.push(frames.slice(index, index + size));
  }
  return batches;
}

function validPercent(value: number | undefined): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
}
