export type AgentRuntimeEvent = {
  id: string;
  sessionId: string;
  personaId: string;
  cursor: number;
  step: number;
  createdAt: string;
  type: "viewport" | "narration" | "research" | "frustration";
  imageUrl?: string;
  text?: string;
  emotion?: string;
  query?: string;
  category?:
    | "navigation"
    | "clarity"
    | "feedback"
    | "recovery"
    | "trust"
    | "accessibility"
    | "technical";
  severity?: 1 | 2 | 3 | 4 | 5;
  observation?: string;
  visibleEvidence?: string;
  currentUrl?: string;
  recommendation?: string;
  x?: number;
  y?: number;
};

const MAX_VIEWPORT_FRAMES_PER_PERSONA = 80;
const MAX_RUNTIME_EVENTS = 600;

export function mergeAgentRuntimeEvents(
  current: AgentRuntimeEvent[],
  incoming: AgentRuntimeEvent[],
): AgentRuntimeEvent[] {
  const byId = new Map(current.map((event) => [event.id, event]));
  for (const event of incoming) byId.set(event.id, event);

  const ordered = [...byId.values()].sort(compareEvents);
  const retainedViewportIds = new Set<string>();
  const framesByPersona = new Map<string, AgentRuntimeEvent[]>();

  for (const event of ordered) {
    if (event.type !== "viewport" || !event.imageUrl) continue;
    const frames = framesByPersona.get(event.personaId) ?? [];
    frames.push(event);
    framesByPersona.set(event.personaId, frames);
  }

  for (const frames of framesByPersona.values()) {
    for (const frame of frames.slice(-MAX_VIEWPORT_FRAMES_PER_PERSONA)) {
      retainedViewportIds.add(frame.id);
    }
  }

  return ordered
    .filter(
      (event) =>
        event.type !== "viewport" || retainedViewportIds.has(event.id),
    )
    .slice(-MAX_RUNTIME_EVENTS);
}

export function getPersonaViewportFrames(
  events: AgentRuntimeEvent[],
  personaId: string | undefined,
): AgentRuntimeEvent[] {
  if (!personaId) return [];
  return events
    .filter(
      (event) =>
        event.personaId === personaId &&
        event.type === "viewport" &&
        Boolean(event.imageUrl),
    )
    .sort(compareEvents);
}

function compareEvents(left: AgentRuntimeEvent, right: AgentRuntimeEvent) {
  return left.cursor - right.cursor || left.createdAt.localeCompare(right.createdAt);
}
