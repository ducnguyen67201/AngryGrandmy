"use client";

import { create } from "zustand";
import { createDemoRun } from "@/lib/fixtures/demo-run";
import type {
  NormalizedSession,
  ProductAnalysis,
  RunPhase,
  RunSnapshot,
  UsabilityReport,
} from "@/lib/schemas/run";

type RunStore = {
  snapshot: RunSnapshot;
  loadDemoRun: () => void;
  setPhase: (phase: RunPhase) => void;
  setAnalysis: (analysis: ProductAnalysis) => void;
  attachSessions: (sessions: NormalizedSession[]) => void;
  updateSession: (session: NormalizedSession) => void;
  selectPersona: (personaId: string) => void;
  completeRun: (report: UsabilityReport) => void;
  failRun: (message: string) => void;
};

const initialRun = createDemoRun();

export const useRunStore = create<RunStore>((set) => ({
  snapshot: initialRun,
  loadDemoRun: () => set({ snapshot: createDemoRun() }),
  setPhase: (phase) =>
    set(({ snapshot }) => ({
      snapshot: touch({ ...snapshot, phase }),
    })),
  setAnalysis: (analysis) =>
    set(({ snapshot }) => ({
      snapshot: touch({
        ...snapshot,
        analysis,
        phase: "revealing",
        selectedPersonaId: analysis.personas[0]?.id ?? null,
      }),
    })),
  attachSessions: (sessions) =>
    set(({ snapshot }) => ({
      snapshot: touch({ ...snapshot, sessions, phase: "running" }),
    })),
  updateSession: (session) =>
    set(({ snapshot }) => ({
      snapshot: touch({
        ...snapshot,
        sessions: snapshot.sessions.map((current) =>
          current.sessionId === session.sessionId ? session : current,
        ),
      }),
    })),
  selectPersona: (personaId) =>
    set(({ snapshot }) => ({
      snapshot: touch({ ...snapshot, selectedPersonaId: personaId }),
    })),
  completeRun: (report) =>
    set(({ snapshot }) => ({
      snapshot: touch({ ...snapshot, phase: "report", report }),
    })),
  failRun: (message) =>
    set(({ snapshot }) => ({
      snapshot: touch({ ...snapshot, phase: "error", error: message }),
    })),
}));

function touch(snapshot: RunSnapshot): RunSnapshot {
  return { ...snapshot, updatedAt: new Date().toISOString() };
}
