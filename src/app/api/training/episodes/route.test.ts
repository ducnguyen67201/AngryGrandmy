import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDemoRun } from "@/lib/fixtures/demo-run";
import type { AgentRuntimeEvent } from "@/lib/runtime/agent-events";
import { GET, POST } from "./route";

let directory = "";

describe("/api/training/episodes", () => {
  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), "grannysmith-training-api-"));
    process.env.GRANNYSMITH_TRAINING_DATASET_FILE = path.join(
      directory,
      "episodes.json",
    );
  });

  afterEach(async () => {
    delete process.env.GRANNYSMITH_TRAINING_DATASET_FILE;
    await rm(directory, { recursive: true, force: true });
  });

  it("collects completed run episodes and lists the dataset", async () => {
    const snapshot = createDemoRun();
    const events: AgentRuntimeEvent[] = [{
      id: "event-1",
      sessionId: snapshot.sessions[0].sessionId,
      personaId: snapshot.sessions[0].personaId,
      cursor: 1,
      step: 1,
      createdAt: "2026-07-11T10:00:00.000Z",
      type: "narration",
      text: "I am looking for the next safe step.",
      emotion: "uncertain",
      x: 20,
      y: 30,
    }];

    const response = await POST(
      new NextRequest("http://localhost/api/training/episodes", {
        method: "POST",
        body: JSON.stringify({ snapshot, events }),
      }),
    );
    const payload = await response.json();

    expect(response.status, JSON.stringify(payload)).toBe(201);
    expect(payload.data.summary.episodeCount).toBe(snapshot.sessions.length);
    expect(payload.data.summary.trainingPointCount).toBeGreaterThan(0);
    expect(payload.data.savedCount).toBe(snapshot.sessions.length);

    const listResponse = await GET();
    const listPayload = await listResponse.json();
    expect(listPayload.data.summary.episodeCount).toBe(snapshot.sessions.length);
    expect(listPayload.data.episodes[0]).toMatchObject({
      runId: snapshot.id,
      targetUrl: snapshot.url,
    });
  });

  it("rejects unfinished runs", async () => {
    const snapshot = { ...createDemoRun(), phase: "running" };
    const response = await POST(
      new NextRequest("http://localhost/api/training/episodes", {
        method: "POST",
        body: JSON.stringify({ snapshot, events: [] }),
      }),
    );

    expect(response.status).toBe(422);
  });
});
