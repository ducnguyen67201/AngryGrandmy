import type {
  FrictionEvent,
  NormalizedSession,
} from "@/lib/schemas/run";

export type VisualHotspot = {
  id: string;
  personaId: string;
  category: FrictionEvent["category"];
  severity: FrictionEvent["severity"];
  x: number;
  y: number;
  label: string;
  evidence: string;
  recommendation: string;
};

const COORDINATES: Record<
  FrictionEvent["category"],
  Array<{ x: number; y: number }>
> = {
  navigation: [
    { x: 20, y: 22 },
    { x: 34, y: 28 },
  ],
  clarity: [
    { x: 50, y: 48 },
    { x: 58, y: 38 },
  ],
  feedback: [
    { x: 72, y: 68 },
    { x: 62, y: 72 },
  ],
  recovery: [
    { x: 28, y: 70 },
    { x: 36, y: 78 },
  ],
  trust: [
    { x: 76, y: 48 },
    { x: 68, y: 54 },
  ],
  accessibility: [
    { x: 84, y: 24 },
    { x: 74, y: 30 },
  ],
  technical: [
    { x: 50, y: 50 },
    { x: 44, y: 58 },
  ],
};

export function buildVisualHotspots(
  sessions: NormalizedSession[],
): VisualHotspot[] {
  return sessions.flatMap((session) =>
    (session.finding?.frictionEvents ?? []).map((event, index) => {
      const coordinate = COORDINATES[event.category][
        index % COORDINATES[event.category].length
      ];

      return {
        id: `${session.personaId}-${event.step}-${index}`,
        personaId: session.personaId,
        category: event.category,
        severity: event.severity,
        x: coordinate.x,
        y: coordinate.y,
        label: event.category,
        evidence: event.visibleEvidence,
        recommendation: event.recommendation,
      };
    }),
  );
}
