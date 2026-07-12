import type { PersonaScenario, NormalizedSession } from "@/lib/schemas/run";
import type { AgentRuntimeEvent } from "@/lib/runtime/agent-events";

export type GrandmaFieldNote = {
  id: string;
  personaId: string;
  personaName: string;
  kind: "found" | "thinking" | "feels" | "complete";
  headline: string;
  detail: string;
  step: number;
  createdAt: string;
  severity?: number;
};

type FieldNotesInput = {
  events: AgentRuntimeEvent[];
  personas: PersonaScenario[];
  sessions: NormalizedSession[];
};

const MAX_FIELD_NOTES = 16;

export function buildGrandmaFieldNotes({
  events,
  personas,
  sessions,
}: FieldNotesInput): GrandmaFieldNote[] {
  const names = new Map(
    personas.map((persona) => [persona.id, persona.displayName]),
  );
  const notes: GrandmaFieldNote[] = [];
  const details = new Set<string>();
  const newestViewportByPersona = new Map<string, AgentRuntimeEvent>();

  for (const event of events) {
    if (event.type !== "viewport") continue;
    const current = newestViewportByPersona.get(event.personaId);
    if (!current || event.cursor > current.cursor) {
      newestViewportByPersona.set(event.personaId, event);
    }
  }

  const add = (note: GrandmaFieldNote) => {
    const detailKey = note.detail.trim().toLocaleLowerCase();
    if (!detailKey || details.has(detailKey)) return;
    details.add(detailKey);
    notes.push(note);
  };

  for (const event of events) {
    const personaName = names.get(event.personaId) ?? "Your tester";

    if (event.type === "frustration" && event.observation) {
      add({
        id: event.id,
        personaId: event.personaId,
        personaName,
        kind: "feels",
        headline: `${personaName} feels unsure here`,
        detail: event.observation,
        step: event.step,
        createdAt: event.createdAt,
        severity: event.severity,
      });
    } else if (event.type === "narration" && event.text) {
      add({
        id: event.id,
        personaId: event.personaId,
        personaName,
        kind: "thinking",
        headline: `${personaName} is thinking aloud`,
        detail: event.text,
        step: event.step,
        createdAt: event.createdAt,
      });
    } else if (event.type === "research" && event.query) {
      add({
        id: event.id,
        personaId: event.personaId,
        personaName,
        kind: "found",
        headline: `${personaName} looked for help`,
        detail: event.query,
        step: event.step,
        createdAt: event.createdAt,
      });
    } else if (event.type === "viewport") {
      if (newestViewportByPersona.get(event.personaId)?.id !== event.id) {
        continue;
      }
      add({
        id: event.id,
        personaId: event.personaId,
        personaName,
        kind: "found",
        headline: `${personaName} reached a new screen`,
        detail: event.currentUrl
          ? readableLocation(event.currentUrl)
          : `New visual evidence arrived at step ${event.step}.`,
        step: event.step,
        createdAt: event.createdAt,
      });
    }
  }

  for (const session of sessions) {
    if (session.sessionId.startsWith("launching-")) continue;

    const personaName = names.get(session.personaId) ?? "Your tester";
    const timestamp =
      session.finishedAt ?? session.startedAt ?? "1970-01-01T00:00:00.000Z";

    if (!session.finding && session.latestActionLabel) {
      const isProviderRunning = /^H agent is running\b/i.test(
        session.latestActionLabel,
      );
      const isTerminal = /terminal state/i.test(session.latestActionLabel);
      add({
        id: `${session.sessionId}:progress:${session.eventCursor}:${session.stepCount}`,
        personaId: session.personaId,
        personaName,
        kind: isTerminal ? "complete" : "found",
        headline: isProviderRunning
          ? `${personaName} is still exploring`
          : isTerminal
            ? `${personaName} finished exploring`
            : `${personaName} found something`,
        detail: isProviderRunning
          ? "Looking through the product now."
          : isTerminal
            ? "Her field notes are on the way."
            : session.latestActionLabel,
        step: session.stepCount,
        createdAt: timestamp,
      });
      continue;
    }

    if (!session.finding) continue;

    add({
      id: `${session.sessionId}:complete`,
      personaId: session.personaId,
      personaName,
      kind: "complete",
      headline: `${personaName} finished the visit`,
      detail: session.finding.summary,
      step: session.stepCount,
      createdAt: timestamp,
    });

    session.finding.frictionEvents.forEach((friction, index) => {
      add({
        id: `${session.sessionId}:friction:${index}`,
        personaId: session.personaId,
        personaName,
        kind: "feels",
        headline: friction.recovered
          ? `${personaName} recovered after a snag`
          : `${personaName} feels unsure here`,
        detail: friction.observation,
        step: friction.step,
        createdAt: timestamp,
        severity: friction.severity,
      });
    });
  }

  return notes
    .sort(
      (left, right) =>
        Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
        right.step - left.step,
    )
    .slice(0, MAX_FIELD_NOTES);
}

function readableLocation(value: string) {
  try {
    const url = new URL(value);
    return `Opened ${url.hostname}${url.pathname === "/" ? "" : url.pathname}.`;
  } catch {
    return "A new page is ready to review.";
  }
}
