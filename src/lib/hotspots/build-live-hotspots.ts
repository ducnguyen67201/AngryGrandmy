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
};

export function buildLiveVisualHotspots(
  signals: LiveFrictionSignal[],
  analysis: ProductAnalysis | null,
): VisualHotspot[] {
  const personaNames = new Map(
    analysis?.personas.map((persona) => [persona.id, persona.displayName]) ?? [],
  );

  return signals.map((signal, index) => {
    const point = coordinateFor(
      signal.category,
      Math.max(0, signal.step - 1) + index,
    );
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
    };
  });
}
