import { describe, expect, it } from "vitest";
import type { AgentRuntimeEvent } from "@/lib/runtime/agent-events";
import type { NormalizedSession, PersonaScenario } from "@/lib/schemas/run";
import { buildGrandmaFieldNotes } from "./grandma-field-notes";

const personas: PersonaScenario[] = [
  persona("linda", "Linda"),
  persona("rosa", "Rosa"),
  persona("mei", "Mei"),
  persona("joan", "Joan"),
];

describe("buildGrandmaFieldNotes", () => {
  it("turns live narration and friction into friendly grandma updates", () => {
    const events: AgentRuntimeEvent[] = [
      event("linda-thought", "narration", 1, {
        text: "Oh, I think this button explains the next step.",
      }),
      event("linda-friction", "frustration", 2, {
        observation: "The icon does not have a visible label.",
        severity: 4,
      }),
    ];

    const notes = buildGrandmaFieldNotes({ events, personas, sessions: [] });

    expect(notes[0]).toMatchObject({
      id: "linda-friction",
      kind: "feels",
      personaName: "Linda",
      headline: "Linda feels unsure here",
      detail: "The icon does not have a visible label.",
    });
    expect(notes[1]).toMatchObject({
      id: "linda-thought",
      kind: "thinking",
      headline: "Linda is thinking aloud",
    });
  });

  it("keeps only the newest screen arrival for each tester", () => {
    const notes = buildGrandmaFieldNotes({
      events: [
        event("linda-screen-1", "viewport", 1),
        event("linda-screen-2", "viewport", 2),
        event("rosa-screen-1", "viewport", 3, { personaId: "rosa" }),
      ],
      personas,
      sessions: [],
    });

    expect(notes.map((note) => note.id)).toEqual([
      "rosa-screen-1",
      "linda-screen-2",
    ]);
  });

  it("describes research and readable viewport locations", () => {
    const notes = buildGrandmaFieldNotes({
      events: [
        event("research", "research", 1, {
          personaId: "unknown",
          query: "Where is the pricing explanation?",
        }),
        event("root", "viewport", 2, {
          personaId: "rosa",
          currentUrl: "https://example.com/",
        }),
        event("path", "viewport", 3, {
          personaId: "mei",
          currentUrl: "https://example.com/pricing",
        }),
        event("invalid", "viewport", 4, {
          personaId: "joan",
          currentUrl: "not a URL",
        }),
      ],
      personas,
      sessions: [],
    });

    expect(notes.find((note) => note.id === "research")).toMatchObject({
      headline: "Your tester looked for help",
      detail: "Where is the pricing explanation?",
    });
    expect(notes.find((note) => note.id === "root")?.detail).toBe(
      "Opened example.com.",
    );
    expect(notes.find((note) => note.id === "path")?.detail).toBe(
      "Opened example.com/pricing.",
    );
    expect(notes.find((note) => note.id === "invalid")?.detail).toBe(
      "A new page is ready to review.",
    );
  });

  it("shows returned session progress before the final finding is ready", () => {
    const notes = buildGrandmaFieldNotes({
      events: [],
      personas,
      sessions: [
        session({
          latestActionLabel: "Opened the pricing page",
          stepCount: 4,
        }),
      ],
    });

    expect(notes[0]).toMatchObject({
      kind: "found",
      headline: "Linda found something",
      detail: "Opened the pricing page",
      step: 4,
    });
  });

  it("does not present a local launch placeholder as returned evidence", () => {
    expect(
      buildGrandmaFieldNotes({
        events: [],
        personas,
        sessions: [
          session({
            sessionId: "launching-linda",
            latestActionLabel: "Requesting H Company session",
          }),
        ],
      }),
    ).toEqual([]);
  });

  it("translates provider progress and terminal states into human language", () => {
    const notes = buildGrandmaFieldNotes({
      events: [],
      personas,
      sessions: [
        session({ latestActionLabel: "H agent is running · 7 steps", stepCount: 7 }),
        session({
          personaId: "rosa",
          sessionId: "session-rosa",
          latestActionLabel: "H session reached a terminal state",
          status: "completed",
          stepCount: 9,
        }),
      ],
    });

    expect(notes.find((note) => note.personaId === "linda")).toMatchObject({
      headline: "Linda is still exploring",
      detail: "Looking through the product now.",
    });
    expect(notes.find((note) => note.personaId === "rosa")).toMatchObject({
      kind: "complete",
      headline: "Rosa finished exploring",
      detail: "Her field notes are on the way.",
    });
  });

  it("keeps final findings, including recovered friction, after completion", () => {
    const completed = session({
      status: "completed",
      finishedAt: "2026-07-11T20:01:00.000Z",
      finding: {
        completion: "success",
        summary: "Linda reached the safe stopping point.",
        evidence: ["Pricing was visible."],
        frictionEvents: [
          {
            step: 5,
            category: "clarity",
            severity: 3,
            observation: "The label was initially unclear.",
            visibleEvidence: "An icon appeared without helper text.",
            recommendation: "Add a text label.",
            narratedObservation: "I am not sure what this icon means.",
            recovered: true,
          },
        ],
        safeStopReached: true,
      },
    });
    const notes = buildGrandmaFieldNotes({
      events: [],
      personas,
      sessions: [completed],
    });

    expect(notes.find((note) => note.kind === "complete")).toBeTruthy();
    expect(notes.find((note) => note.kind === "feels")?.headline).toBe(
      "Linda recovered after a snag",
    );
  });

  it("deduplicates repeated details, ignores empty updates, and caps the stream", () => {
    const repeated = Array.from({ length: 20 }, (_, index) =>
      event(`thought-${index}`, "narration", index + 1, {
        text: `Thought ${index}`,
      }),
    );
    repeated.push(
      event("duplicate", "narration", 22, { text: "Thought 19" }),
      event("empty", "narration", 23, { text: "   " }),
    );

    const notes = buildGrandmaFieldNotes({
      events: repeated,
      personas,
      sessions: [session({ latestActionLabel: null })],
    });

    expect(notes).toHaveLength(16);
    expect(notes[0].id).toBe("thought-19");
    expect(notes.some((note) => note.id === "duplicate")).toBe(false);
    expect(notes.some((note) => note.id === "empty")).toBe(false);
  });
});

function persona(id: string, displayName: string): PersonaScenario {
  return {
    id,
    displayName,
    tagline: "Careful visitor",
    context: `${displayName} is testing the product.`,
    digitalConfidence: "low",
    behaviors: ["Reads labels carefully."],
    accessibilityContext: [],
    trustBoundaries: ["Stops before submitting data."],
    task: "Find the main workflow.",
    successCriteria: ["Finds the workflow."],
    stopConditions: ["Stop before submission."],
    expectedStepBudget: 10,
    introLine: `I am ${displayName}.`,
    voiceSlot: 0,
    visualVariant: 0,
  };
}

function session(
  overrides: Partial<NormalizedSession> = {},
): NormalizedSession {
  return {
    sessionId: "session-linda",
    personaId: "linda",
    status: "running",
    visualState: "reading",
    eventCursor: 3,
    stepCount: 3,
    startedAt: "2026-07-11T20:00:00.000Z",
    finishedAt: null,
    agentViewUrl: null,
    outcome: "unknown",
    latestActionLabel: "Reading the home page",
    finding: null,
    errorCode: null,
    ...overrides,
  };
}

function event(
  id: string,
  type: AgentRuntimeEvent["type"],
  cursor: number,
  overrides: Partial<AgentRuntimeEvent> = {},
): AgentRuntimeEvent {
  return {
    id,
    sessionId: "session-linda",
    personaId: "linda",
    cursor,
    step: cursor,
    createdAt: `2026-07-11T20:00:${String(cursor).padStart(2, "0")}.000Z`,
    type,
    ...(type === "viewport" ? { imageUrl: `data:image/png;base64,${id}` } : {}),
    ...overrides,
  };
}
