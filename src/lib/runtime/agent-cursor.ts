import type { AgentRuntimeEvent } from "./agent-events";

export type AgentCursorPoint = {
  x: number;
  y: number;
  eventId: string;
  source: "agent" | "evidence";
};

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
