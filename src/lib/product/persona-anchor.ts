import type { PersonaScenario } from "@/lib/schemas/run";

function unique(values: string[]) {
  return [...new Set(values)];
}

export function anchorLindaPersona(
  candidate: PersonaScenario,
  linda: PersonaScenario,
): PersonaScenario {
  return {
    ...candidate,
    displayName: "Linda",
    context: `${linda.context} Product-specific situation: ${candidate.context}`,
    digitalConfidence: "low",
    behaviors: unique([...linda.behaviors, ...candidate.behaviors]),
    accessibilityContext: unique([
      ...linda.accessibilityContext,
      ...candidate.accessibilityContext,
    ]),
    introLine: linda.introLine,
  };
}
