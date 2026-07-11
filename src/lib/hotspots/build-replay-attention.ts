import type { VisualHotspot } from "./build-hotspots";
import type { AgentRuntimeEvent } from "@/lib/runtime/agent-events";

export function buildReplayAttentionHotspots(
  events: readonly AgentRuntimeEvent[],
  personaId: string | undefined,
  frameCursor: number,
): VisualHotspot[] {
  if (!personaId) return [];

  return events.flatMap((event) => {
    if (
      event.personaId !== personaId ||
      event.cursor > frameCursor ||
      !validPercent(event.x) ||
      !validPercent(event.y) ||
      (event.type !== "narration" && event.type !== "frustration")
    ) {
      return [];
    }

    const severity = event.type === "frustration"
      ? event.severity ?? 4
      : narrationSeverity(event.emotion);
    return [{
      id: `attention-${event.id}`,
      personaId,
      personaName: personaId,
      category: event.category ?? "clarity",
      severity,
      x: event.x,
      y: event.y,
      label: event.type === "frustration" ? "frustration" : "attention",
      evidence: event.observation ?? event.text ?? "Observed this interface element.",
      recommendation: event.recommendation ?? "Review this high-attention interface area.",
    }];
  });
}

function narrationSeverity(
  emotion: string | undefined,
): 1 | 2 | 3 | 4 | 5 {
  if (emotion === "frustrated") return 4;
  if (emotion === "uncertain") return 3;
  if (emotion === "relieved") return 1;
  return 2;
}

function validPercent(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}
