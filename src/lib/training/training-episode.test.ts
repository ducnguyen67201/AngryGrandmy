import { describe, expect, it } from "vitest";
import { createDemoRun } from "@/lib/fixtures/demo-run";
import type { AgentRuntimeEvent } from "@/lib/runtime/agent-events";
import {
  buildTrainingEpisodes,
  summarizeTrainingCollection,
} from "./training-episode";

describe("training episode builder", () => {
  it("turns a completed run and runtime events into persona training episodes", () => {
    const snapshot = createDemoRun();
    const session = snapshot.sessions[0];
    const persona = snapshot.analysis?.personas.find(
      (item) => item.id === session.personaId,
    );
    const events: AgentRuntimeEvent[] = [
      {
        id: "viewport-1",
        sessionId: session.sessionId,
        personaId: session.personaId,
        cursor: 1,
        step: 1,
        createdAt: "2026-07-11T10:00:00.000Z",
        type: "viewport",
        imageUrl: "data:image/png;base64,abc123",
        currentUrl: snapshot.url,
      },
      {
        id: "narration-1",
        sessionId: session.sessionId,
        personaId: session.personaId,
        cursor: 2,
        step: 2,
        createdAt: "2026-07-11T10:00:01.000Z",
        type: "narration",
        text: "Where is the next button?",
        emotion: "uncertain",
        x: 42,
        y: 58,
      },
      {
        id: "frustration-1",
        sessionId: session.sessionId,
        personaId: session.personaId,
        cursor: 3,
        step: 3,
        createdAt: "2026-07-11T10:00:02.000Z",
        type: "frustration",
        category: "clarity",
        severity: 4,
        observation: "The next step was unclear.",
        visibleEvidence: "The primary action used vague copy.",
        currentUrl: snapshot.url,
        recommendation: "Use a plain-language button label.",
        x: 52,
        y: 44,
      },
    ];

    const episodes = buildTrainingEpisodes({ snapshot, events });

    expect(episodes).toHaveLength(snapshot.sessions.length);
    expect(episodes[0]).toMatchObject({
      runId: snapshot.id,
      sessionId: session.sessionId,
      personaId: session.personaId,
      targetUrl: snapshot.url,
      objective: snapshot.objective,
      persona: {
        displayName: persona?.displayName,
        task: persona?.task,
      },
      labels: {
        completion: session.finding?.completion,
        frictionCount: session.finding?.frictionEvents.length,
      },
    });
    expect(episodes[0].trajectory).toEqual([
      expect.objectContaining({
        eventId: "viewport-1",
        type: "viewport",
        screenshot: {
          kind: "inline-redacted",
          ref: expect.stringMatching(/^sha256:/),
        },
      }),
      expect.objectContaining({
        eventId: "narration-1",
        type: "narration",
        text: "Where is the next button?",
        x: 42,
        y: 58,
      }),
      expect.objectContaining({
        eventId: "frustration-1",
        type: "frustration",
        category: "clarity",
        severity: 4,
        recommendation: "Use a plain-language button label.",
      }),
    ]);
    expect(episodes[0].trainingPoints).toBeGreaterThan(1);
  });

  it("summarizes collected training points across episodes", () => {
    const snapshot = createDemoRun();
    const episodes = buildTrainingEpisodes({ snapshot, events: [] });

    expect(summarizeTrainingCollection(episodes)).toEqual({
      episodeCount: snapshot.sessions.length,
      trainingPointCount: episodes.reduce(
        (total, episode) => total + episode.trainingPoints,
        0,
      ),
      frictionCount: snapshot.sessions.reduce(
        (total, session) => total + (session.finding?.frictionEvents.length ?? 0),
        0,
      ),
      personaCount: new Set(snapshot.sessions.map((session) => session.personaId))
        .size,
    });
  });
});
