import type {
  NormalizedSession,
  PersonaScenario,
  ProductAnalysis,
} from "@/lib/schemas/run";

export const DEFAULT_TESTER_COUNT = 4;
export const TESTER_COUNT_OPTIONS = [1, 2, 3, 4] as const;
export type TesterCount = (typeof TESTER_COUNT_OPTIONS)[number];

export function getTesterCountFromRequest(input: unknown): TesterCount {
  const value =
    typeof input === "object" && input !== null && "testerCount" in input
      ? (input as { testerCount?: unknown }).testerCount
      : typeof input === "object" && input !== null && "personaLimit" in input
        ? (input as { personaLimit?: unknown }).personaLimit
        : DEFAULT_TESTER_COUNT;

  return isTesterCount(value) ? value : DEFAULT_TESTER_COUNT;
}

export function isTesterCount(value: unknown): value is TesterCount {
  return TESTER_COUNT_OPTIONS.includes(value as TesterCount);
}

export function limitPersonasForTesterCount(
  analysis: ProductAnalysis,
  testerCount: TesterCount,
): PersonaScenario[] {
  return analysis.personas.slice(0, testerCount);
}

export function getDispatchedPersonas(
  analysis: ProductAnalysis | null,
  sessions: readonly Pick<NormalizedSession, "personaId">[],
): PersonaScenario[] {
  if (!analysis || sessions.length === 0) return [];

  const dispatchedPersonaIds = new Set(
    sessions.map((session) => session.personaId),
  );
  return analysis.personas.filter((persona) =>
    dispatchedPersonaIds.has(persona.id),
  );
}
