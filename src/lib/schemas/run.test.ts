import { describe, expect, it } from "vitest";
import { validateAnalyzeRequest } from "@/lib/security/url-policy";
import {
  analyzeRequestSchema,
  productAnalysisSchema,
  runSnapshotSchema,
  visualAgentStateSchema
} from "./run";

const persona = {
  id: "linda",
  displayName: "Linda",
  tagline: "Cautious first timer",
  context: "Wants to understand the product without making an account.",
  digitalConfidence: "low",
  behaviors: ["Reads every confirmation copy", "Avoids unlabeled icons"],
  accessibilityContext: ["Uses browser zoom"],
  trustBoundaries: ["Will not enter payment details"],
  task: "Find a safe way to book a trial appointment.",
  successCriteria: ["Finds appointment flow"],
  stopConditions: ["Stop before booking a real appointment"],
  expectedStepBudget: 12,
  introLine: "I will try this slowly and stop before anything real is submitted.",
  voiceSlot: 0,
  visualVariant: 0
} as const;

const analysis = {
  productName: "Demo Clinic",
  productCategory: "Healthcare booking",
  summary: "A deliberately flawed booking website.",
  primaryFlows: [
    {
      name: "Appointment",
      goal: "Find care",
      safeStopPoint: "Before final booking"
    }
  ],
  globalSafetyBoundaries: ["Use synthetic data only"],
  personas: [persona, { ...persona, id: "rosa" }, { ...persona, id: "mei" }, { ...persona, id: "joan" }]
} as const;

const session = {
  sessionId: "session-linda",
  personaId: "linda",
  status: "completed",
  visualState: "succeeded",
  eventCursor: 8,
  stepCount: 8,
  startedAt: "2026-07-11T17:00:00.000Z",
  finishedAt: "2026-07-11T17:02:00.000Z",
  agentViewUrl: "https://app.hcompany.ai/sessions/session-linda",
  outcome: "success",
  latestActionLabel: "Reached safe stop point",
  finding: {
    completion: "success",
    summary: "Reached the safe stop point.",
    evidence: ["Found the appointment page"],
    frictionEvents: [],
    safeStopReached: true
  },
  errorCode: null
} as const;

describe("run schemas", () => {
  it("accepts authorized analysis request shapes", () => {
    expect(
      analyzeRequestSchema.parse({
        url: "https://example.com",
        authorizationConfirmed: true
      })
    ).toMatchObject({ url: "https://example.com" });
  });

  it("rejects missing authorization at the schema boundary", () => {
    expect(() =>
      analyzeRequestSchema.parse({
        url: "https://example.com",
        authorizationConfirmed: false
      })
    ).toThrow();
  });

  it("blocks non-web and private URLs at the URL policy boundary", () => {
    expect(() =>
      validateAnalyzeRequest({
        url: "ftp://example.com",
        authorizationConfirmed: true
      })
    ).toThrow("Only HTTP and HTTPS URLs can be tested.");

    expect(() =>
      validateAnalyzeRequest({
        url: "http://localhost:3000",
        authorizationConfirmed: true
      })
    ).toThrow("Private, localhost, and link-local URLs are blocked.");
  });

  it("requires exactly four persona scenarios", () => {
    expect(() => productAnalysisSchema.parse(analysis)).not.toThrow();

    expect(() =>
      productAnalysisSchema.parse({
        ...analysis,
        personas: [persona]
      })
    ).toThrow();
  });

  it("keeps visual states finite for the lab renderers", () => {
    expect(visualAgentStateSchema.options).toContain("confused");
    expect(visualAgentStateSchema.safeParse("teleporting").success).toBe(false);
  });

  it("validates a complete demo snapshot shape", () => {
    expect(() =>
      runSnapshotSchema.parse({
        id: "demo-run",
        phase: "report",
        url: "https://demo-health.example",
        objective: "Find an appointment flow",
        analysis,
        selectedPersonaId: "linda",
        createdAt: "2026-07-11T17:00:00.000Z",
        updatedAt: "2026-07-11T17:03:00.000Z",
        error: null,
        sessions: [
          session,
          { ...session, sessionId: "session-rosa", personaId: "rosa" },
          { ...session, sessionId: "session-mei", personaId: "mei" },
          { ...session, sessionId: "session-joan", personaId: "joan" }
        ],
        report: {
          score: 54,
          dimensions: {
            completion: 20,
            efficiency: 12,
            clarity: 7,
            recovery: 10,
            trust: 5
          },
          completedCount: 2,
          sharedHotspots: [],
          topRecommendations: ["Replace jargon with plain-language labels"],
          disclosure:
            "Synthetic usability benchmark; not a replacement for human research or accessibility certification."
        }
      })
    ).not.toThrow();
  });
});
