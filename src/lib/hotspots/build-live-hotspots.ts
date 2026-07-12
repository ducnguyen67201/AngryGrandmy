import type { FrictionEvent, ProductAnalysis } from "@/lib/schemas/run";
import { coordinateFor, type VisualHotspot } from "./build-hotspots";

export type LiveFrictionSignal = {
  id: string;
  personaId: string;
  step: number;
  category: FrictionEvent["category"];
  severity: FrictionEvent["severity"];
  observation: string;
  visibleEvidence: string;
  recommendation: string;
  x?: number;
  y?: number;
};

export function buildLiveVisualHotspots(
  signals: LiveFrictionSignal[],
  analysis: ProductAnalysis | null,
): VisualHotspot[] {
  const personaNames = new Map(
    analysis?.personas.map((persona) => [persona.id, persona.displayName]) ?? [],
  );

  return signals.map((signal, index) => {
    const fallbackPoint = coordinateFor(
      signal.category,
      Math.max(0, signal.step - 1) + index,
    );
    const point = {
      x: validPercent(signal.x) ? signal.x : fallbackPoint.x,
      y: validPercent(signal.y) ? signal.y : fallbackPoint.y,
    };
    return {
      id: signal.id,
      personaId: signal.personaId,
      personaName: personaNames.get(signal.personaId) ?? signal.personaId,
      category: signal.category,
      severity: signal.severity,
      x: point.x,
      y: point.y,
      label: signal.category,
      evidence: signal.visibleEvidence || signal.observation,
      recommendation: signal.recommendation,
      step: signal.step,
    };
  });
}

function validPercent(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}
