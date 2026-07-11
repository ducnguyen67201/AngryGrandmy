import type {
  FrictionEvent,
  NormalizedSession,
  ProductAnalysis,
} from "@/lib/schemas/run";

export type VisualHotspot = {
  id: string;
  personaId: string;
  personaName: string;
  category: FrictionEvent["category"];
  severity: FrictionEvent["severity"];
  x: number;
  y: number;
  label: string;
  evidence: string;
  recommendation: string;
};

const CATEGORY_COORDINATES: Record<
  FrictionEvent["category"],
  Array<{ x: number; y: number }>
> = {
  navigation: [
    { x: 28, y: 28 },
    { x: 18, y: 42 },
    { x: 42, y: 22 },
  ],
  clarity: [
    { x: 52, y: 45 },
    { x: 62, y: 35 },
    { x: 44, y: 58 },
  ],
  feedback: [
    { x: 66, y: 70 },
    { x: 74, y: 58 },
    { x: 54, y: 72 },
  ],
  recovery: [
    { x: 30, y: 70 },
    { x: 22, y: 58 },
    { x: 40, y: 76 },
  ],
  trust: [
    { x: 70, y: 42 },
    { x: 78, y: 54 },
    { x: 62, y: 60 },
  ],
  accessibility: [
    { x: 84, y: 24 },
    { x: 76, y: 28 },
    { x: 86, y: 38 },
  ],
  technical: [
    { x: 50, y: 50 },
    { x: 46, y: 42 },
    { x: 58, y: 52 },
  ],
};

export function buildVisualHotspots(
  sessions: NormalizedSession[],
  analysis: ProductAnalysis | null,
): VisualHotspot[] {
  const personaNames = new Map(
    analysis?.personas.map((persona) => [persona.id, persona.displayName]) ?? [],
  );

  return sessions.flatMap((session) =>
    (session.finding?.frictionEvents ?? []).map((event, index) => {
      const point = coordinateFor(event.category, index);

      return {
        id: `${session.sessionId}-${event.step}-${index}`,
        personaId: session.personaId,
        personaName: personaNames.get(session.personaId) ?? session.personaId,
        category: event.category,
        severity: event.severity,
        x: point.x,
        y: point.y,
        label: event.category,
        evidence: event.visibleEvidence,
        recommendation: event.recommendation,
      };
    }),
  );
}

export function summarizeHotspots(hotspots: VisualHotspot[]) {
  return hotspots.reduce<Record<FrictionEvent["category"], number>>(
    (summary, hotspot) => {
      summary[hotspot.category] += 1;
      return summary;
    },
    {
      navigation: 0,
      clarity: 0,
      feedback: 0,
      recovery: 0,
      trust: 0,
      accessibility: 0,
      technical: 0,
    },
  );
}

export function coordinateFor(category: FrictionEvent["category"], index: number) {
  const lane = CATEGORY_COORDINATES[category];
  return lane[index % lane.length];
}
