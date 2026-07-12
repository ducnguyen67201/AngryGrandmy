import { describe, expect, it } from "vitest";
import { createDemoRun } from "@/lib/fixtures/demo-run";
import type { AgentRuntimeEvent } from "@/lib/runtime/agent-events";
import { buildGrandmaFieldNotes } from "./grandma-field-notes";

describe("buildGrandmaFieldNotes", () => {
  it("turns live narration and friction into friendly grandma updates", () => {
    const run = createDemoRun();
    const events: AgentRuntimeEvent[] = [
      {
        id: "linda-thought",
        sessionId: "demo-linda",
        personaId: "linda",
        cursor: 1,
        step: 2,
        createdAt: "2026-07-11T20:00:01.000Z",
        type: "narration",
        text: "Oh, I think this button explains the next step.",
      },
      {
        id: "linda-friction",
        sessionId: "demo-linda",
        personaId: "linda",
        cursor: 2,
        step: 3,
        createdAt: "2026-07-11T20:00:02.000Z",
        type: "frustration",
        observation: "The icon does not have a visible label.",
        severity: 4,
      },
    ];

    const notes = buildGrandmaFieldNotes({
      events,
      personas: run.analysis!.personas,
      sessions: run.sessions,
    });

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

  it("shows returned session progress before the final finding is ready", () => {
    const run = createDemoRun();
    const session = {
      ...run.sessions[0],
      status: "running" as const,
      finding: null,
      finishedAt: null,
      latestActionLabel: "Opened the pricing page",
      stepCount: 4,
    };

    const notes = buildGrandmaFieldNotes({
      events: [],
      personas: run.analysis!.personas,
      sessions: [session],
    });

    expect(notes[0]).toMatchObject({
      kind: "found",
      headline: "Linda found something",
      detail: "Opened the pricing page",
      step: 4,
    });
  });

  it("does not present a local launch placeholder as returned evidence", () => {
    const run = createDemoRun();
    const session = {
      ...run.sessions[0],
      sessionId: "launching-linda",
      status: "queued" as const,
      finding: null,
      finishedAt: null,
      latestActionLabel: "Requesting H Company session",
      stepCount: 0,
    };

    expect(
      buildGrandmaFieldNotes({
        events: [],
        personas: run.analysis!.personas,
        sessions: [session],
      }),
    ).toEqual([]);
  });

  it("keeps final findings in the feed after the run completes", () => {
    const run = createDemoRun();
    const notes = buildGrandmaFieldNotes({
      events: [],
      personas: run.analysis!.personas,
      sessions: [run.sessions[0]],
    });

    expect(notes.some((note) => note.kind === "complete")).toBe(true);
    expect(notes.some((note) => note.kind === "feels")).toBe(true);
  });
});
