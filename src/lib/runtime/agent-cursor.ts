import type { AgentRuntimeEvent } from "./agent-events";

export type AgentCursorPoint = {
  x: number;
  y: number;
  eventId: string;
  source: "agent" | "evidence";
};

export function buildDemoCursorFallback(
  frameIndex: number,
  frameCount: number,
): { id: string; x: number; y: number } {
  const lastIndex = Math.max(0, Math.floor(frameCount) - 1);
  const safeIndex = Math.min(lastIndex, Math.max(0, Math.floor(frameIndex)));
  const progress = lastIndex === 0 ? 0 : safeIndex / lastIndex;

  return {
    id: `demo-cursor-${safeIndex}`,
    x: 18 + progress * 64,
    y: 48 + Math.sin(progress * Math.PI * 2) * 22,
  };
}

export function buildAnimatedCursorFallback(
  frameIndex: number,
  frameCount: number,
  animationTick: number,
): { id: string; x: number; y: number } {
  const safeFrameIndex = Math.max(0, Math.floor(frameIndex));
  const safeFrameCount = Math.max(1, Math.floor(frameCount));
  const safeTick = Math.max(0, Math.floor(animationTick));
  const phase = safeTick * 0.58 + safeFrameIndex * 0.37;
  const frameBias = (safeFrameIndex % safeFrameCount) / safeFrameCount;

  return {
    id: `live-cursor-${safeFrameIndex}-${safeTick}`,
    x: clamp(50 + Math.sin(phase) * 34 + Math.sin(frameBias * Math.PI * 2) * 5, 8, 92),
    y: clamp(49 + Math.sin(phase * 1.43 + 1.2) * 27, 10, 88),
  };
}

export function getAgentCursorForFrame({
  events,
  personaId,
  frameCursor,
  fallback,
}: {
  events: readonly AgentRuntimeEvent[];
  personaId: string;
  frameCursor: number;
  fallback: { id: string; x: number; y: number } | null;
}): AgentCursorPoint | null {
  const reported = events
    .filter(
      (event) =>
        event.personaId === personaId &&
        event.cursor <= frameCursor &&
        validPercent(event.x) &&
        validPercent(event.y),
    )
    .sort((left, right) => right.cursor - left.cursor)[0];

  if (reported && validPercent(reported.x) && validPercent(reported.y)) {
    return {
      x: reported.x,
      y: reported.y,
      eventId: reported.id,
      source: "agent",
    };
  }

  if (fallback && validPercent(fallback.x) && validPercent(fallback.y)) {
    return {
      x: fallback.x,
      y: fallback.y,
      eventId: fallback.id,
      source: "evidence",
    };
  }

  return null;
}

function validPercent(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
