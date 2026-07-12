import type { FrictionEvent, NormalizedSession } from "@/lib/schemas/run";

export type ImprovementCandidate = {
  personaId: string;
  sessionId: string;
  friction: FrictionEvent;
};

export function selectImprovementCandidate(
  sessions: readonly NormalizedSession[],
): ImprovementCandidate | null {
  const candidates = sessions.flatMap((session) =>
    (session.finding?.frictionEvents ?? []).map((friction) => ({
      personaId: session.personaId,
      sessionId: session.sessionId,
      friction,
    })),
  );

  return candidates.sort((left, right) =>
    right.friction.severity - left.friction.severity ||
    Number(left.friction.recovered) - Number(right.friction.recovered),
  )[0] ?? null;
}
